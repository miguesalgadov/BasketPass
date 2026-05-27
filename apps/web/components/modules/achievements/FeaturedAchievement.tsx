'use client';

import { Share2 } from 'lucide-react';
import { AchievementBadge } from './AchievementBadge';
import { AchievementProgressBar } from './AchievementProgressBar';
import { RarityBadge } from './RarityBadge';
import { CATEGORY_CONFIG } from './types';
import type { Achievement } from './types';

const FEATURED_BG: Record<string, string> = {
  EPIC:      'from-purple-900/40 to-purple-800/10',
  LEGENDARY: 'from-yellow-900/40 to-amber-800/10',
  RARE:      'from-blue-900/40 to-blue-800/10',
  COMMON:    'from-white/[0.05] to-transparent',
};

interface FeaturedAchievementProps {
  achievement: Achievement;
  onShare?: () => void;
}

export function FeaturedAchievement({ achievement, onShare }: FeaturedAchievementProps) {
  const { color } = CATEGORY_CONFIG[achievement.category];
  const bgGradient = FEATURED_BG[achievement.rarity] ?? FEATURED_BG.COMMON;
  const isInProgress = achievement.status === 'IN_PROGRESS';
  const isUnlocked   = achievement.status === 'UNLOCKED';
  const pct = achievement.target && achievement.target > 0
    ? Math.min(100, Math.round((achievement.progress ?? 0) / achievement.target * 100))
    : 0;

  return (
    <div
      className={`relative rounded-2xl border overflow-hidden bg-gradient-to-br ${bgGradient}`}
      style={{
        borderColor: achievement.rarity === 'EPIC'
          ? '#A855F755'
          : achievement.rarity === 'LEGENDARY'
          ? '#F5B30155'
          : achievement.rarity === 'RARE'
          ? '#3B82F655'
          : 'rgba(255,255,255,0.1)',
      }}
    >
      {/* DESTACADO label */}
      <div className="absolute top-3 left-3">
        <span className="text-[9px] font-black tracking-widest text-white/40 uppercase bg-white/10 px-2 py-0.5 rounded-full">
          Destacado
        </span>
      </div>

      <div className="p-5 pt-10 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        {/* Badge */}
        <div className="flex-shrink-0 flex items-center justify-center">
          <AchievementBadge
            icon={achievement.icon}
            category={achievement.category}
            rarity={achievement.rarity}
            status={achievement.status ?? 'LOCKED'}
            size="lg"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="text-sm font-black text-white">{achievement.name}</p>
            <RarityBadge rarity={achievement.rarity} />
          </div>
          <p className="text-[11px] text-white/50 leading-relaxed mb-3">{achievement.description}</p>

          {isInProgress && achievement.target && achievement.target > 1 && (
            <AchievementProgressBar
              progress={achievement.progress ?? 0}
              target={achievement.target}
              category={achievement.category}
              metric={achievement.metric}
            />
          )}

          {isUnlocked && achievement.unlockedAt && (
            <p className="text-[10px] text-white/30">
              Desbloqueado el {new Date(achievement.unlockedAt).toLocaleDateString('es-CL', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          )}
        </div>

        {/* Reward block */}
        <div className="flex-shrink-0 text-right space-y-3">
          <div
            className="rounded-xl p-3 text-center min-w-[90px]"
            style={{ background: `${color}18`, border: `1px solid ${color}33` }}
          >
            <p className="text-[9px] text-white/40 uppercase tracking-widest">Recompensa</p>
            <p className="text-lg font-black" style={{ color }}>+{achievement.points}</p>
            <p className="text-[9px] text-white/40">pts ⭐</p>
          </div>

          {onShare && (
            <button
              onClick={onShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/15 text-xs text-white/60 hover:text-white hover:border-white/30 transition w-full justify-center"
            >
              <Share2 size={12} />
              Compartir
            </button>
          )}
        </div>
      </div>

      {/* Progress text inline (compact) */}
      {isInProgress && pct > 0 && (
        <div className="px-5 pb-4">
          <p className="text-[10px] text-white/30 text-right">{pct}% completado</p>
        </div>
      )}
    </div>
  );
}
