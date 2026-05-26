import { AchievementBadge } from './AchievementBadge';
import type { Achievement, AchievementCategory } from './types';

interface RecentEvent {
  id:          string;
  playerName:  string;
  playerAvatar?: string | null;
  achievement: Pick<Achievement, 'name' | 'icon' | 'category' | 'rarity'>;
  unlockedAt:  string;
}

interface RecentAchievementsProps {
  events: RecentEvent[];
}

export function RecentAchievements({ events }: RecentAchievementsProps) {
  if (events.length === 0) {
    return (
      <p className="text-center text-white/30 text-sm py-8">
        Aún no hay logros desbloqueados en el equipo.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((e) => (
        <div
          key={e.id}
          className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/8 px-3 py-2.5"
        >
          <AchievementBadge
            icon={e.achievement.icon}
            category={e.achievement.category as AchievementCategory}
            rarity={e.achievement.rarity}
            status="UNLOCKED"
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white/90 truncate">{e.playerName}</p>
            <p className="text-[10px] text-white/40 truncate">{e.achievement.name}</p>
          </div>
          <p className="text-[10px] text-white/25 flex-shrink-0">
            {new Date(e.unlockedAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
          </p>
        </div>
      ))}
    </div>
  );
}
