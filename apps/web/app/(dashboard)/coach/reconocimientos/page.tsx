'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { RecentAchievements } from '@/components/modules/achievements/RecentAchievements';
import type { Achievement, AchievementCategory } from '@/components/modules/achievements/types';

interface RecentEvent {
  id:          string;
  playerName:  string;
  playerAvatar?: string | null;
  achievement: Pick<Achievement, 'name' | 'icon' | 'category' | 'rarity'>;
  unlockedAt:  string;
}

interface RankingEntry {
  playerId:      string;
  playerName:    string;
  playerAvatar?: string | null;
  unlockedCount: number;
  totalPoints:   number;
}

export default function CoachReconocimientosPage() {
  const [recent,  setRecent]  = useState<RecentEvent[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/achievements/recent'),
      api.get('/achievements/ranking'),
    ]).then(([r1, r2]) => {
      setRecent(r1.data.data ?? []);
      setRanking(r2.data.data ?? []);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-white/30" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1117] -m-4 lg:-m-6 p-4 lg:p-6 pb-24 lg:pb-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-widest mb-0.5">Coach</p>
          <h1 className="text-xl font-black text-white">Reconocimientos</h1>
        </div>
        <Link
          href="/coach/reconocimientos/nuevo"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-xs font-bold text-white transition"
        >
          <Plus size={14} />
          Otorgar
        </Link>
      </div>

      {/* Ranking */}
      <div>
        <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">
          Ranking del equipo
        </p>
        {ranking.length > 0 ? (
          <div className="space-y-1.5">
            {ranking.slice(0, 10).map((r, i) => (
              <div
                key={r.playerId}
                className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/8 px-3 py-2.5"
              >
                <span className={`text-xs font-black w-5 text-center ${
                  i === 0 ? 'text-yellow-400' : i === 1 ? 'text-white/60' : i === 2 ? 'text-orange-400' : 'text-white/25'
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white/90 truncate">{r.playerName}</p>
                  <p className="text-[10px] text-white/40">{r.unlockedCount} logros</p>
                </div>
                <span className="text-xs font-bold text-yellow-400">{r.totalPoints} pts</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white/30 text-sm text-center py-6">Sin datos aún.</p>
        )}
      </div>

      {/* Recent */}
      <div>
        <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">
          Últimos desbloqueados
        </p>
        <RecentAchievements events={recent} />
      </div>
    </div>
  );
}
