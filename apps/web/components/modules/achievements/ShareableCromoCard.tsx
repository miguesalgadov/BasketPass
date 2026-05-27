import Image from 'next/image';
import { Trophy, User } from 'lucide-react';
import { AchievementBadge } from './AchievementBadge';
import { AchievementProgressBar } from './AchievementProgressBar';
import { RarityBadge } from './RarityBadge';
import type { Achievement, PlayerProfile } from './types';

export type CromoFormat = 'square' | 'story' | 'og';

const FORMAT_STYLE: Record<CromoFormat, string> = {
  square: 'aspect-square w-full',
  story:  'aspect-[9/16] w-full',
  og:     'aspect-[1.91/1] w-full',
};

const RARITY_BG: Record<string, string> = {
  LEGENDARY: 'from-yellow-900 via-amber-800 to-orange-900',
  EPIC:      'from-purple-900 via-violet-800 to-indigo-900',
  RARE:      'from-blue-900 via-blue-800 to-sky-900',
  COMMON:    'from-slate-900 via-slate-800 to-slate-900',
};

const RARITY_GLOW: Record<string, string> = {
  LEGENDARY: 'rgba(245,179,1,0.5)',
  EPIC:      'rgba(168,85,247,0.5)',
  RARE:      'rgba(59,130,246,0.4)',
  COMMON:    'transparent',
};

interface ShareableCromoCardProps {
  achievement: Achievement;
  player:      PlayerProfile;
  format?:     CromoFormat;
  innerRef?:   React.RefObject<HTMLDivElement>;
}

export function ShareableCromoCard({
  achievement,
  player,
  format = 'square',
  innerRef,
}: ShareableCromoCardProps) {
  const bgGradient = RARITY_BG[achievement.rarity] ?? RARITY_BG.COMMON;
  const glowColor  = RARITY_GLOW[achievement.rarity] ?? 'transparent';
  const isProgress = achievement.status === 'IN_PROGRESS';
  const isUnlocked = achievement.status === 'UNLOCKED';
  const pct = achievement.target && achievement.target > 0
    ? Math.min(100, Math.round((achievement.progress ?? 0) / achievement.target * 100))
    : 0;

  return (
    <div
      ref={innerRef}
      className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${bgGradient} ${FORMAT_STYLE[format]} flex flex-col`}
      style={{ boxShadow: `0 0 30px ${glowColor}` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Trophy size={12} className="text-white/70" />
          <span className="text-[10px] font-black text-white/70 tracking-widest uppercase">BasketPass</span>
        </div>
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
          isUnlocked
            ? 'bg-green-500/30 text-green-300'
            : 'bg-white/15 text-white/60'
        }`}>
          {isUnlocked ? 'Logro Desbloqueado' : 'En Progreso'}
        </span>
      </div>

      {/* Badge */}
      <div className="flex-1 flex items-center justify-center py-4">
        <div className="flex flex-col items-center gap-3">
          <div
            className="p-3 rounded-full"
            style={{
              background: `${glowColor.replace('0.5', '0.15')}`,
              boxShadow:  `0 0 40px ${glowColor}`,
            }}
          >
            <AchievementBadge
              icon={achievement.icon}
              category={achievement.category}
              rarity={achievement.rarity}
              status={achievement.status ?? 'LOCKED'}
              size="lg"
            />
          </div>
          <div className="text-center px-4">
            <p className="text-lg font-black text-white uppercase tracking-wide leading-tight">
              {achievement.name}
            </p>
            <p className="text-[11px] text-white/60 mt-1 leading-snug max-w-[200px] mx-auto">
              {achievement.description}
            </p>
            <div className="flex justify-center mt-2">
              <RarityBadge rarity={achievement.rarity} />
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar (if in progress) */}
      {isProgress && achievement.target && achievement.target > 1 && (
        <div className="px-4 pb-2">
          <AchievementProgressBar
            progress={achievement.progress ?? 0}
            target={achievement.target}
            category={achievement.category}
            metric={achievement.metric}
          />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2.5 px-4 pb-4 flex-shrink-0 border-t border-white/10 pt-3">
        <div className="w-7 h-7 rounded-full overflow-hidden border border-white/20 bg-white/10 flex items-center justify-center flex-shrink-0">
          {player.avatarUrl ? (
            <Image src={player.avatarUrl} alt="" width={28} height={28} className="object-cover" />
          ) : (
            <User size={14} className="text-white/40" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-white truncate">
            {player.firstName} {player.lastName}
          </p>
          {player.team && (
            <p className="text-[9px] text-white/50 truncate">{player.team.name}</p>
          )}
        </div>
        {player.club?.logo && (
          <Image src={player.club.logo} alt="" width={24} height={24} className="object-contain flex-shrink-0" />
        )}
      </div>
    </div>
  );
}
