export type AchievementCategory = 'IDENTITY' | 'ATTENDANCE' | 'OFFENSE' | 'DEFENSE' | 'TEAMPLAY' | 'PARTICIPATION' | 'COACH' | 'SEASON';
export type AchievementRarity   = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
export type AchievementStatus   = 'LOCKED' | 'IN_PROGRESS' | 'UNLOCKED';

export interface Achievement {
  id:          string;
  name:        string;
  description: string;
  category:    AchievementCategory;
  icon:        string;
  triggerType: 'AUTOMATIC' | 'MANUAL';
  metric:      string | null;
  threshold:   number | null;
  points:      number;
  rarity:      AchievementRarity;
  isActive:    boolean;
  // player-specific (when fetched via /player/:id)
  status?:       AchievementStatus;
  progress?:     number;
  target?:       number;
  unlockedAt?:   string | null;
  coachComment?: string | null;
}

export interface AchievementSummary {
  unlockedCount:   number;
  inProgressCount: number;
  totalPoints:     number;
  level:           { id: number; name: string; min: number; max: number; color: string };
  unreadEvents:    number;
}

export const CATEGORY_CONFIG: Record<AchievementCategory, { label: string; color: string; bg: string }> = {
  IDENTITY:      { label: 'Identidad',       color: '#0057FF', bg: 'bg-blue-500/10'    },
  ATTENDANCE:    { label: 'Asistencia',       color: '#12B76A', bg: 'bg-green-500/10'  },
  OFFENSE:       { label: 'Ofensiva',         color: '#FF5A00', bg: 'bg-orange-500/10' },
  DEFENSE:       { label: 'Defensa',          color: '#0D1B2A', bg: 'bg-slate-800/40'  },
  TEAMPLAY:      { label: 'Juego Colectivo',  color: '#38BDF8', bg: 'bg-sky-400/10'    },
  PARTICIPATION: { label: 'Participación',    color: '#0EA5E9', bg: 'bg-sky-500/10'    },
  COACH:         { label: 'Coach',            color: '#F5B301', bg: 'bg-yellow-500/10' },
  SEASON:        { label: 'Temporada',        color: '#F5B301', bg: 'bg-amber-500/10'  },
};

export const RARITY_LABEL: Record<AchievementRarity, string> = {
  COMMON:    'Común',
  RARE:      'Raro',
  EPIC:      'Épico',
  LEGENDARY: 'Legendario',
};
