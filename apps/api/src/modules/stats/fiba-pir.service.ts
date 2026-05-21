export type StatPlayerData = {
  points: number;
  offRebounds: number;
  defRebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  drawFouls: number;
  fg2Made: number;
  fg2Attempted: number;
  fg3Made: number;
  fg3Attempted: number;
  ftMade: number;
  ftAttempted: number;
  turnovers: number;
  personalFouls: number;
};

export function calculatePIR(s: StatPlayerData): number {
  const reb = s.offRebounds + s.defRebounds;
  const positive =
    s.points + reb + s.assists + s.steals + s.blocks + s.drawFouls;
  const negative =
    (s.fg2Attempted - s.fg2Made) +
    (s.fg3Attempted - s.fg3Made) +
    (s.ftAttempted - s.ftMade) +
    s.turnovers +
    s.personalFouls;
  return positive - negative;
}

export function effectiveFGPct(s: StatPlayerData): number {
  const fga = s.fg2Attempted + s.fg3Attempted;
  if (fga === 0) return 0;
  return (s.fg2Made + s.fg3Made + 0.5 * s.fg3Made) / fga;
}

export function trueShotPct(s: StatPlayerData): number {
  const fga = s.fg2Attempted + s.fg3Attempted;
  const tsa = 2 * (fga + 0.44 * s.ftAttempted);
  if (tsa === 0) return 0;
  return s.points / tsa;
}

export function getActionPoints(action: string): number {
  const pts: Record<string, number> = {
    FG2_MADE: 2,
    FG3_MADE: 3,
    FT_MADE: 1,
  };
  return pts[action] ?? 0;
}

export function isShotAction(action: string): boolean {
  return [
    'FG2_MADE',
    'FG2_MISSED',
    'FG3_MADE',
    'FG3_MISSED',
    'FT_MADE',
    'FT_MISSED',
  ].includes(action);
}

export function isMadeShot(action: string): boolean {
  return ['FG2_MADE', 'FG3_MADE', 'FT_MADE'].includes(action);
}

export function getShotType(action: string): string {
  if (action.startsWith('FG3')) return 'THREE_POINT';
  if (action.startsWith('FT')) return 'FREE_THROW';
  return 'TWO_POINT';
}
