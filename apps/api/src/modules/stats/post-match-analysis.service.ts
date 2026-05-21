import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/config/database';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generatePostMatchAnalysis(sessionId: string): Promise<void> {
  const session = await prisma.matchStatSession.findUnique({
    where: { id: sessionId },
    include: {
      match: {
        include: {
          homeTeam: { include: { team: true } },
          awayTeam: { include: { team: true } },
        },
      },
      lineups: { include: { player: { include: { user: true } }, stats: true } },
    },
  });

  if (!session || session.status !== 'FINISHED') return;

  const homeParticipantId = session.match?.homeTeamId ?? null;
  const awayParticipantId = session.match?.awayTeamId ?? null;
  const homeName =
    (session.match as any)?.homeTeam?.team?.name ??
    (session.match as any)?.homeTeam?.externalName ??
    (session as any).homeTeamName ??
    'Local';
  const awayName =
    (session.match as any)?.awayTeam?.team?.name ??
    (session.match as any)?.awayTeam?.externalName ??
    (session as any).awayTeamName ??
    'Visitante';

  const buildPlayerLines = (lineups: any[]) =>
    lineups
      .filter((l) => l.stats && !l.stats.didNotPlay)
      .map((l) => {
        const s = l.stats;
        const name = l.player?.user
          ? `${l.player.user.firstName} ${l.player.user.lastName}`
          : l.externalPlayerName ?? 'Jugador';
        return (
          `${name} | ${s.points}pts ${s.offRebounds + s.defRebounds}reb ` +
          `${s.assists}ast ${s.steals}stl ${s.blocks}blk ${s.turnovers}to ` +
          `${s.personalFouls}pf PIR:${s.pir}`
        );
      })
      .join('\n');

  const homeLineups = session.lineups.filter(
    (l) => l.participantId === homeParticipantId,
  );
  const awayLineups = session.lineups.filter(
    (l) => l.participantId === awayParticipantId,
  );

  const prompt = `Eres un analista experto en baloncesto FIBA. Analiza este partido y genera un reporte en español.

PARTIDO: ${homeName} ${session.homeScore} - ${session.awayScore} ${awayName}

${homeName}:
${buildPlayerLines(homeLineups)}

${awayName}:
${buildPlayerLines(awayLineups)}

Responde SOLO con este JSON exacto:
{
  "recap": "Resumen narrativo del partido en 3-4 oraciones.",
  "keyMoments": [{"period": 1, "description": "..."}, {"period": 2, "description": "..."}],
  "homeStrengths": ["..."],
  "awayStrengths": ["..."],
  "homeWeaknesses": ["..."],
  "awayWeaknesses": ["..."],
  "mvpName": "nombre del MVP",
  "mvpJustification": "Por qué fue MVP",
  "tacticalConclusion": "Conclusión táctica breve"
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw =
      response.content[0].type === 'text' ? response.content[0].text : '{}';
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      // fallback: empty parsed
    }

    const allStats = session.lineups.filter(
      (l) => l.stats && !(l.stats as any).didNotPlay,
    );
    const mvp = allStats.sort(
      (a: any, b: any) => (b.stats?.pir ?? 0) - (a.stats?.pir ?? 0),
    )[0];

    await prisma.matchAnalysis.upsert({
      where: { sessionId },
      create: {
        sessionId,
        generatedById: 'system',
        recapText: parsed.recap ?? 'Análisis no disponible.',
        keyMoments: JSON.stringify(parsed.keyMoments ?? []),
        homeEffRating: 0,
        awayEffRating: 0,
        homePace: 0,
        awayPace: 0,
        homeNetRating: 0,
        awayNetRating: 0,
        topPerformer: JSON.stringify({
          lineupId: mvp?.id,
          name: parsed.mvpName,
          justification: parsed.mvpJustification,
          pir: (mvp?.stats as any)?.pir ?? 0,
        }),
        teamOfMatch:
          session.homeScore > session.awayScore ? 'home' : 'away',
        mvpPlayerId: mvp?.playerId ?? null,
        homeVsSeasonAvg: '{}',
        awayVsSeasonAvg: '{}',
        strengths: JSON.stringify({
          homeStrengths: parsed.homeStrengths ?? [],
          awayStrengths: parsed.awayStrengths ?? [],
          homeWeaknesses: parsed.homeWeaknesses ?? [],
          awayWeaknesses: parsed.awayWeaknesses ?? [],
          tacticalConclusion: parsed.tacticalConclusion,
        }),
      },
      update: {
        recapText: parsed.recap ?? 'Análisis no disponible.',
        keyMoments: JSON.stringify(parsed.keyMoments ?? []),
        topPerformer: JSON.stringify({
          lineupId: mvp?.id,
          name: parsed.mvpName,
          justification: parsed.mvpJustification,
          pir: (mvp?.stats as any)?.pir ?? 0,
        }),
        strengths: JSON.stringify({
          homeStrengths: parsed.homeStrengths ?? [],
          awayStrengths: parsed.awayStrengths ?? [],
          homeWeaknesses: parsed.homeWeaknesses ?? [],
          awayWeaknesses: parsed.awayWeaknesses ?? [],
          tacticalConclusion: parsed.tacticalConclusion,
        }),
      },
    });

    await prisma.matchStatSession.update({
      where: { id: sessionId },
      data: { analysisGenerated: true },
    });
  } catch (e) {
    console.error('Analysis generation failed:', e);
  }
}
