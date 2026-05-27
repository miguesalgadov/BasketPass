'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AchievementBadge } from './AchievementBadge';
import { AchievementProgressBar } from './AchievementProgressBar';
import { RarityBadge } from './RarityBadge';
import { CATEGORY_CONFIG } from './types';
import type { Achievement } from './types';

const RARITY_BORDER: Record<string, string> = {
  COMMON:    'border-white/8',
  RARE:      'border-blue-500/40',
  EPIC:      'border-purple-500/50',
  LEGENDARY: 'border-yellow-400/60',
};

const RARITY_GLOW: Record<string, string> = {
  COMMON:    '',
  RARE:      '0 0 10px rgba(59,130,246,0.2)',
  EPIC:      '0 0 14px rgba(168,85,247,0.3)',
  LEGENDARY: '0 0 18px rgba(245,179,1,0.4)',
};

const RARITY_BG: Record<string, string> = {
  COMMON:    'bg-white/[0.04]',
  RARE:      'bg-blue-900/10',
  EPIC:      'bg-purple-900/15',
  LEGENDARY: 'bg-yellow-900/15',
};

interface AchievementCardProps {
  achievement: Achievement;
  compact?: boolean;
}

export function AchievementCard({ achievement, compact = false }: AchievementCardProps) {
  const [detail, setDetail] = useState(false);

  const status = achievement.status ?? 'LOCKED';
  const locked = status === 'LOCKED';
  const { color, label: categoryLabel } = CATEGORY_CONFIG[achievement.category];
  const borderClass = locked ? 'border-white/5' : RARITY_BORDER[achievement.rarity] ?? RARITY_BORDER.COMMON;
  const bgClass     = locked ? 'bg-white/[0.02]' : RARITY_BG[achievement.rarity] ?? RARITY_BG.COMMON;
  const glowStyle   = locked ? '' : RARITY_GLOW[achievement.rarity] ?? '';

  return (
    <>
      <div
        onClick={() => !locked && setDetail(true)}
        className={cn(
          'group relative rounded-xl border p-3 flex flex-col items-center text-center gap-2 transition-all duration-200',
          borderClass, bgClass,
          !locked && 'cursor-pointer hover:scale-[1.02]',
          locked && 'opacity-50',
        )}
        style={glowStyle ? { boxShadow: glowStyle } : undefined}
      >
        {/* Badge */}
        <div className="mt-1">
          <AchievementBadge
            icon={achievement.icon}
            category={achievement.category}
            rarity={achievement.rarity}
            status={status}
            size="md"
          />
        </div>

        {/* Name */}
        <p className={cn('text-[11px] font-bold leading-tight', locked ? 'text-white/30' : 'text-white/90')}>
          {achievement.name}
        </p>

        {/* Progress */}
        {status === 'IN_PROGRESS' && achievement.target && achievement.target > 1 && (
          <AchievementProgressBar
            progress={achievement.progress ?? 0}
            target={achievement.target}
            category={achievement.category}
            metric={achievement.metric}
            compact
          />
        )}

        {/* Unlocked date */}
        {status === 'UNLOCKED' && achievement.unlockedAt && (
          <p className="text-[9px] text-white/25">
            {new Date(achievement.unlockedAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
          </p>
        )}

        {/* Pills */}
        <div className="flex flex-wrap gap-1 justify-center mt-auto">
          <span
            className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
          >
            {categoryLabel}
          </span>
          {achievement.rarity !== 'COMMON' && (
            <RarityBadge rarity={achievement.rarity} />
          )}
        </div>

        {/* Status pill */}
        <span className={cn(
          'text-[9px] font-semibold px-2 py-0.5 rounded-full',
          status === 'UNLOCKED'    ? 'bg-green-500/20 text-green-400' :
          status === 'IN_PROGRESS' ? 'bg-orange-500/20 text-orange-400' :
                                     'bg-white/5 text-white/20',
        )}>
          {status === 'UNLOCKED' ? '✓ Desbloqueado' : status === 'IN_PROGRESS' ? 'En progreso' : '🔒 Bloqueado'}
        </span>
      </div>

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#1A1F2B] border border-white/10 p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <AchievementBadge
                  icon={achievement.icon}
                  category={achievement.category}
                  rarity={achievement.rarity}
                  status={status}
                  size="lg"
                />
                <div>
                  <p className="text-sm font-black text-white">{achievement.name}</p>
                  <RarityBadge rarity={achievement.rarity} className="mt-1" />
                </div>
              </div>
              <button onClick={() => setDetail(false)} className="text-white/40 hover:text-white p-1">
                <X size={16} />
              </button>
            </div>

            <p className="text-[12px] text-white/60 leading-relaxed">{achievement.description}</p>

            {status === 'IN_PROGRESS' && achievement.target && achievement.target > 1 && (
              <AchievementProgressBar
                progress={achievement.progress ?? 0}
                target={achievement.target}
                category={achievement.category}
                metric={achievement.metric}
              />
            )}

            {status === 'UNLOCKED' && achievement.unlockedAt && (
              <p className="text-[11px] text-white/40">
                Desbloqueado el {new Date(achievement.unlockedAt).toLocaleDateString('es-CL', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
            )}

            {achievement.coachComment && (
              <p className="text-[11px] text-yellow-400/80 italic border-t border-white/10 pt-3">
                "{achievement.coachComment}"
              </p>
            )}

            <div className="flex items-center justify-between pt-1">
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: `${color}18`, color }}
              >
                {categoryLabel}
              </span>
              <span className="text-[11px] font-bold text-yellow-400">+{achievement.points} pts</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
