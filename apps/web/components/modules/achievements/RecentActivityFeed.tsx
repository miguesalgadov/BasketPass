'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Trophy, Star, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { AchievementBadge } from './AchievementBadge';
import type { AchievementCategory, AchievementRarity } from './types';

interface ActivityItem {
  id:          string;
  type:        'UNLOCKED' | 'PROGRESS' | 'COACH_AWARDED';
  message:     string;
  createdAt:   string;
  achievement: {
    name:     string;
    icon:     string;
    category: AchievementCategory;
    rarity:   AchievementRarity;
  };
}

const TYPE_DOT: Record<string, string> = {
  UNLOCKED:      'bg-green-400',
  COACH_AWARDED: 'bg-yellow-400',
  PROGRESS:      'bg-blue-400',
};

const TYPE_ICON: Record<string, React.ElementType> = {
  UNLOCKED:      Trophy,
  COACH_AWARDED: Star,
  PROGRESS:      Zap,
};

interface RecentActivityFeedProps {
  playerId: string;
  limit?:   number;
}

export function RecentActivityFeed({ playerId, limit = 3 }: RecentActivityFeedProps) {
  const [items,   setItems]   = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/achievements/player/${playerId}/activity?limit=${limit}`)
      .then((r) => setItems(r.data.data?.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [playerId, limit]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: limit }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-white/[0.03] animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="text-[11px] text-white/30 text-center py-4">Sin actividad reciente.</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const DotClass = TYPE_DOT[item.type] ?? 'bg-white/30';
        return (
          <div key={item.id} className="flex items-start gap-2.5">
            {/* Dot */}
            <div className="flex flex-col items-center pt-1.5 flex-shrink-0">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DotClass}`} />
            </div>

            {/* Badge small */}
            <AchievementBadge
              icon={item.achievement.icon}
              category={item.achievement.category}
              rarity={item.achievement.rarity}
              status={item.type === 'UNLOCKED' || item.type === 'COACH_AWARDED' ? 'UNLOCKED' : 'IN_PROGRESS'}
              size="sm"
            />

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-white/80 leading-tight truncate">
                {item.achievement.name}
              </p>
              <p className="text-[9px] text-white/35 mt-0.5 leading-snug line-clamp-2">
                {item.message}
              </p>
              <p className="text-[9px] text-white/25 mt-0.5">
                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: es })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
