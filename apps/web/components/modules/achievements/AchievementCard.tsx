import { cn } from '@/lib/utils';
import { AchievementBadge } from './AchievementBadge';
import { AchievementProgressBar } from './AchievementProgressBar';
import { CATEGORY_CONFIG, RARITY_LABEL } from './types';
import type { Achievement } from './types';

interface AchievementCardProps {
  achievement: Achievement;
  compact?: boolean;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  UNLOCKED:    { label: 'Desbloqueado', cls: 'bg-green-500/20 text-green-400' },
  IN_PROGRESS: { label: 'En progreso',  cls: 'bg-white/10 text-white/50' },
  LOCKED:      { label: 'Bloqueado',    cls: 'bg-white/5 text-white/25' },
};

export function AchievementCard({ achievement, compact = false }: AchievementCardProps) {
  const status    = achievement.status ?? 'LOCKED';
  const sb        = STATUS_BADGE[status];
  const { color } = CATEGORY_CONFIG[achievement.category];
  const locked    = status === 'LOCKED';

  return (
    <div
      className={cn(
        'group relative rounded-xl border p-3 transition-all duration-200',
        locked ? 'bg-white/[0.02] border-white/5' : 'bg-white/[0.04] border-white/10 hover:border-white/20',
        !locked && 'hover:shadow-[0_4px_16px_rgba(0,0,0,.25)]',
      )}
      style={locked ? {} : { boxShadow: `0 0 0 0 ${color}` }}
    >
      {/* Rarity badge */}
      {achievement.rarity !== 'COMMON' && (
        <span className="absolute top-2 right-2 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-white/10 text-white/40">
          {RARITY_LABEL[achievement.rarity]}
        </span>
      )}

      <div className="flex items-start gap-2.5">
        <AchievementBadge
          icon={achievement.icon}
          category={achievement.category}
          rarity={achievement.rarity}
          status={status}
          size={compact ? 'sm' : 'md'}
        />
        <div className="flex-1 min-w-0">
          <p className={cn('text-xs font-semibold leading-tight', locked ? 'text-white/30' : 'text-white/90')}>
            {achievement.name}
          </p>
          {!compact && (
            <p className={cn('text-[10px] mt-0.5 leading-snug', locked ? 'text-white/15' : 'text-white/40')}>
              {achievement.description}
            </p>
          )}
          <span className={cn('inline-block mt-1 text-[9px] font-semibold px-2 py-0.5 rounded-full', sb.cls)}>
            {sb.label}
          </span>
        </div>
      </div>

      {status === 'IN_PROGRESS' && achievement.target && (achievement.target > 1) && (
        <AchievementProgressBar
          className="mt-2.5"
          progress={achievement.progress ?? 0}
          target={achievement.target}
          category={achievement.category}
          metric={achievement.metric}
        />
      )}

      {status === 'UNLOCKED' && achievement.unlockedAt && (
        <p className="mt-1.5 text-[9px] text-white/25 text-right">
          {new Date(achievement.unlockedAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      )}

      {status === 'UNLOCKED' && achievement.coachComment && (
        <p className="mt-1.5 text-[10px] text-yellow-400/70 italic border-t border-white/10 pt-1.5">
          "{achievement.coachComment}"
        </p>
      )}
    </div>
  );
}
