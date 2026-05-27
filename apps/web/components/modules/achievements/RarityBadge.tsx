import { cn } from '@/lib/utils';
import type { AchievementRarity } from './types';
import { RARITY_LABEL } from './types';

const RARITY_STYLE: Record<AchievementRarity, string> = {
  COMMON:    'bg-slate-500/20 text-slate-400 border-slate-500/30',
  RARE:      'bg-blue-500/20 text-blue-400 border-blue-500/30',
  EPIC:      'bg-purple-500/20 text-purple-400 border-purple-500/30',
  LEGENDARY: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

interface RarityBadgeProps {
  rarity: AchievementRarity;
  className?: string;
}

export function RarityBadge({ rarity, className }: RarityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full border',
        RARITY_STYLE[rarity],
        className,
      )}
    >
      {RARITY_LABEL[rarity]}
    </span>
  );
}
