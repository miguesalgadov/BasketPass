export interface Level {
  id: number;
  name: string;
  min: number;
  max: number;
  color: string;
}

export const LEVELS: Level[] = [
  { id: 1, name: 'Rookie',           min: 0,  max: 2,        color: '#7A8098' },
  { id: 2, name: 'En Desarrollo',    min: 3,  max: 5,        color: '#0057FF' },
  { id: 3, name: 'Intermedio',       min: 6,  max: 9,        color: '#12B76A' },
  { id: 4, name: 'Avanzado',         min: 10, max: 14,       color: '#A855F7' },
  { id: 5, name: 'Élite',            min: 15, max: 24,       color: '#F5B301' },
  { id: 6, name: 'Leyenda del Club', min: 25, max: Infinity, color: '#F5B301' },
];

export function getNextLevel(currentLevelId: number): Level | null {
  return LEVELS.find((l) => l.id === currentLevelId + 1) ?? null;
}

export function getProgressToNextLevel(unlockedCount: number): number {
  const current = getPlayerLevel(unlockedCount);
  if (current.id === 6) return 100;
  const next = getNextLevel(current.id);
  if (!next) return 100;
  const rangeSize = next.min - current.min;
  const progress = unlockedCount - current.min;
  return Math.min(100, Math.round((progress / rangeSize) * 100));
}

export function getPlayerLevel(unlockedCount: number): Level {
  return LEVELS.find((l) => unlockedCount >= l.min && unlockedCount <= l.max) ?? LEVELS[0];
}
