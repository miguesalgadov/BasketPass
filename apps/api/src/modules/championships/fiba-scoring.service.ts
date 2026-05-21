interface StandingData {
  participantId: string;
  played: number; won: number; lost: number;
  walkoversWon: number; walkoversLost: number;
  pointsFor: number; pointsAgainst: number;
  tablePoints: number; pointsDiff: number;
}

interface H2HData { won: number; lost: number; pf: number; pa: number; }
type H2HMap = Record<string, Record<string, H2HData>>;

export function getTablePoints(result: 'WIN' | 'LOSS' | 'WALKOVER_WIN' | 'WALKOVER_LOSS', system: string): number {
  if (result === 'WIN' || result === 'WALKOVER_WIN') return 2;
  if (result === 'LOSS') return system === 'FIBA' ? 1 : 0;
  return 0; // WALKOVER_LOSS
}

export function cappedDiff(a: number, b: number): number {
  return Math.max(-150, Math.min(150, a - b));
}

export function sortStandings(standings: StandingData[], h2h: H2HMap): StandingData[] {
  return [...standings].sort((a, b) => {
    if (b.tablePoints !== a.tablePoints) return b.tablePoints - a.tablePoints;

    const tied = standings.filter(s => s.tablePoints === a.tablePoints);
    if (tied.length > 1) {
      const ha = h2hSubTable(a.participantId, tied, h2h);
      const hb = h2hSubTable(b.participantId, tied, h2h);
      if (hb.wins !== ha.wins) return hb.wins - ha.wins;
      if (hb.diff !== ha.diff) return hb.diff - ha.diff;
      if (hb.pf   !== ha.pf)   return hb.pf   - ha.pf;
    }

    if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff;
    return b.pointsFor - a.pointsFor;
  });
}

function h2hSubTable(pid: string, tied: StandingData[], h2h: H2HMap) {
  return tied
    .filter(s => s.participantId !== pid)
    .reduce((acc, opp) => {
      const r = h2h[pid]?.[opp.participantId] ?? { won: 0, lost: 0, pf: 0, pa: 0 };
      return { wins: acc.wins + r.won, diff: acc.diff + (r.pf - r.pa), pf: acc.pf + r.pf };
    }, { wins: 0, diff: 0, pf: 0 });
}
