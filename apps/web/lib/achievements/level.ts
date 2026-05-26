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
  { id: 3, name: 'Jugador Activo',   min: 6,  max: 9,        color: '#12B76A' },
  { id: 4, name: 'Impacto Real',     min: 10, max: 14,       color: '#FF5A00' },
  { id: 5, name: 'Jugador Élite',    min: 15, max: 24,       color: '#F5B301' },
  { id: 6, name: 'Leyenda del Club', min: 25, max: Infinity, color: '#F5B301' },
];

export function getPlayerLevel(unlockedCount: number): Level {
  return LEVELS.find((l) => unlockedCount >= l.min && unlockedCount <= l.max) ?? LEVELS[0];
}
