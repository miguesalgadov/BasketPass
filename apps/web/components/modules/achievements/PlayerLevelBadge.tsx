import type { Level } from '@/lib/achievements/level';

interface PlayerLevelBadgeProps {
  level:         Level;
  unlockedCount: number;
  size?:         'sm' | 'md';
}

export function PlayerLevelBadge({ level, unlockedCount, size = 'md' }: PlayerLevelBadgeProps) {
  const isLegendary = level.id === 6;
  const nextLevel   = unlockedCount >= level.min ? level.max - unlockedCount : 0;

  if (size === 'sm') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
        style={{ background: level.color + '22', color: level.color, border: `1px solid ${level.color}44` }}
      >
        {level.name}
      </span>
    );
  }

  return (
    <div
      className="rounded-xl px-4 py-3 text-center"
      style={{ background: level.color + '15', border: `1px solid ${level.color}30` }}
    >
      <p className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5">Nivel actual</p>
      <p className="text-base font-black" style={{ color: level.color }}>{level.name}</p>
      <p className="text-[11px] text-white/40 mt-0.5">
        {unlockedCount} logro{unlockedCount !== 1 ? 's' : ''}
        {!isLegendary && nextLevel > 0 && ` · ${nextLevel} para el siguiente`}
        {isLegendary && ' · Nivel máximo'}
      </p>
    </div>
  );
}
