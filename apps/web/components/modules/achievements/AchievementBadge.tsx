import {
  Trophy, Target, Shield, Flame, Star, Medal, Zap, Crown, Users,
  UserCheck, Dumbbell, CalendarCheck, PlayCircle, Crosshair, TrendingUp, Award,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AchievementCategory, AchievementRarity, AchievementStatus } from './types';
import { CATEGORY_CONFIG } from './types';

const ICON_MAP: Record<string, LucideIcon> = {
  trophy: Trophy, target: Target, shield: Shield, flame: Flame,
  star: Star, medal: Medal, zap: Zap, crown: Crown, users: Users,
  'user-check': UserCheck, dumbbell: Dumbbell, 'calendar-check': CalendarCheck,
  'play-circle': PlayCircle, crosshair: Crosshair, 'trending-up': TrendingUp,
  award: Award,
};

interface AchievementBadgeProps {
  icon:     string;
  category: AchievementCategory;
  rarity:   AchievementRarity;
  status:   AchievementStatus;
  size?:    'sm' | 'md' | 'lg';
}

const SIZE = { sm: 28, md: 44, lg: 60 };
const ICON_SIZE = { sm: 13, md: 20, lg: 28 };

export function AchievementBadge({ icon, category, rarity, status, size = 'md' }: AchievementBadgeProps) {
  const IconComp = ICON_MAP[icon] ?? Trophy;
  const { color } = CATEGORY_CONFIG[category];
  const px = SIZE[size];
  const iconPx = ICON_SIZE[size];
  const locked = status === 'LOCKED';

  const rarityRing = rarity === 'LEGENDARY' ? 'ring-2 ring-yellow-400/60' : rarity === 'EPIC' ? 'ring-2 ring-purple-500/50' : '';

  return (
    <div
      className={cn('rounded-full flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105', rarityRing)}
      style={{
        width: px, height: px,
        background: locked ? 'rgba(255,255,255,0.04)' : `${color}22`,
        border: `1.5px solid ${locked ? 'rgba(255,255,255,0.1)' : color + '55'}`,
        opacity: locked ? 0.45 : 1,
      }}
    >
      <IconComp size={iconPx} style={{ color: locked ? '#7A8098' : color }} />
    </div>
  );
}
