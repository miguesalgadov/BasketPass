import { Trophy, Zap, Star } from 'lucide-react';
import { PlayerLevelBadge } from './PlayerLevelBadge';
import type { AchievementSummary } from './types';

interface AchievementsSummaryProps {
  summary: AchievementSummary;
}

export function AchievementsSummary({ summary }: AchievementsSummaryProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 text-center">
          <Trophy size={16} className="mx-auto text-green-400 mb-1" />
          <p className="text-lg font-black text-white">{summary.unlockedCount}</p>
          <p className="text-[10px] text-white/40">Desbloqueados</p>
        </div>
        <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 text-center">
          <Zap size={16} className="mx-auto text-orange-400 mb-1" />
          <p className="text-lg font-black text-white">{summary.inProgressCount}</p>
          <p className="text-[10px] text-white/40">En progreso</p>
        </div>
        <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 text-center">
          <Star size={16} className="mx-auto text-yellow-400 mb-1" />
          <p className="text-lg font-black text-white">{summary.totalPoints}</p>
          <p className="text-[10px] text-white/40">Puntos</p>
        </div>
      </div>
      <PlayerLevelBadge level={summary.level} unlockedCount={summary.unlockedCount} />
    </div>
  );
}
