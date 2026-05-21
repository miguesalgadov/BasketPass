interface Participant { id: string; }

interface GeneratedMatch { homeId: string; awayId: string; leg: number; }
export interface GeneratedRound { number: number; name: string; phase: string; scheduledDate: Date; matches: GeneratedMatch[]; }

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function generateRoundRobin(
  participants: Participant[],
  format: 'SINGLE_ROUND_ROBIN' | 'DOUBLE_ROUND_ROBIN',
  startDate: Date,
  daysBetweenRounds = 7
): GeneratedRound[] {
  const teams = [...participants];
  const hasBye = teams.length % 2 !== 0;
  if (hasBye) teams.push({ id: 'BYE' });

  const N = teams.length;
  const rounds: GeneratedRound[] = [];
  const fixed    = teams[0];
  const rotating = teams.slice(1);

  for (let r = 0; r < N - 1; r++) {
    const roundTeams = [fixed, ...rotating];
    const matches: GeneratedMatch[] = [];

    for (let i = 0; i < N / 2; i++) {
      const home = roundTeams[i];
      const away = roundTeams[N - 1 - i];
      if (home.id === 'BYE' || away.id === 'BYE') continue;
      matches.push({ homeId: home.id, awayId: away.id, leg: 1 });
    }

    rounds.push({
      number: r + 1,
      name: `Jornada ${r + 1}`,
      phase: 'REGULAR',
      scheduledDate: addDays(startDate, r * daysBetweenRounds),
      matches,
    });

    rotating.unshift(rotating.pop()!);
  }

  if (format === 'DOUBLE_ROUND_ROBIN') {
    const returnRounds = rounds.map((round, ri) => ({
      number: round.number + (N - 1),
      name: `Jornada ${round.number + (N - 1)} (vuelta)`,
      phase: 'REGULAR',
      scheduledDate: addDays(startDate, (ri + N - 1) * daysBetweenRounds),
      matches: round.matches.map(m => ({ homeId: m.awayId, awayId: m.homeId, leg: 2 })),
    }));
    rounds.push(...returnRounds);
  }

  return rounds;
}

export function generateGroupsFixture(
  groups: Participant[][],
  startDate: Date,
  daysBetweenRounds = 7
): GeneratedRound[] {
  const groupLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  // Generate per-group round-robins (with local round numbers starting at 1)
  const perGroup: GeneratedRound[][] = groups.map((groupParticipants, gi) => {
    const label = groupLetters[gi] ?? String(gi + 1);
    const phase = `GROUP_${label}`;
    const localRounds = generateRoundRobin(groupParticipants, 'SINGLE_ROUND_ROBIN', startDate, daysBetweenRounds);
    return localRounds.map((r, ri) => ({
      ...r,
      name: `Grupo ${label} - Jornada ${ri + 1}`,
      phase,
    }));
  });

  // Find how many rounds the longest group has
  const maxRounds = Math.max(...perGroup.map(g => g.length));

  // Interleave: Grupo A Jornada 1, Grupo B Jornada 1, ..., Grupo A Jornada 2, ...
  const result: GeneratedRound[] = [];
  let globalNumber = 1;
  for (let r = 0; r < maxRounds; r++) {
    for (let gi = 0; gi < perGroup.length; gi++) {
      const round = perGroup[gi][r];
      if (!round) continue;
      result.push({ ...round, number: globalNumber++ });
    }
  }

  return result;
}

export function generatePlayoffMatchups(qualifiedIds: string[]): { seed1: string; seed2: string }[] {
  const n = qualifiedIds.length;
  const matchups = [];
  for (let i = 0; i < n / 2; i++) {
    matchups.push({ seed1: qualifiedIds[i], seed2: qualifiedIds[n - 1 - i] });
  }
  return matchups;
}
