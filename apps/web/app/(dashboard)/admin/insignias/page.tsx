'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { AchievementCatalog } from '@/components/modules/achievements/AchievementCatalog';
import { RecentAchievements } from '@/components/modules/achievements/RecentAchievements';
import toast from 'react-hot-toast';
import type { Achievement } from '@/components/modules/achievements/types';

interface RecentEvent {
  id:          string;
  playerName:  string;
  achievement: Pick<Achievement, 'name' | 'icon' | 'category' | 'rarity'>;
  unlockedAt:  string;
}

interface RankingEntry {
  playerId:      string;
  playerName:    string;
  unlockedCount: number;
  totalPoints:   number;
}

export default function AdminInsigniasPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [recent,       setRecent]       = useState<RecentEvent[]>([]);
  const [ranking,      setRanking]      = useState<RankingEntry[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState<'catalog' | 'ranking' | 'recent'>('catalog');

  useEffect(() => {
    Promise.all([
      api.get('/achievements'),
      api.get('/achievements/recent'),
      api.get('/achievements/ranking'),
    ]).then(([r1, r2, r3]) => {
      setAchievements(r1.data.data ?? []);
      setRecent(r2.data.data ?? []);
      setRanking(r3.data.data ?? []);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle(id: string, isActive: boolean) {
    try {
      await api.patch(`/achievements/${id}`, { isActive });
      setAchievements((prev) =>
        prev.map((a) => a.id === id ? { ...a, isActive } : a)
      );
      toast.success(isActive ? 'Insignia activada' : 'Insignia desactivada');
    } catch {
      toast.error('Error al actualizar');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-white/30" />
      </div>
    );
  }

  const TABS = [
    { key: 'catalog', label: 'Catálogo' },
    { key: 'ranking', label: 'Ranking' },
    { key: 'recent',  label: 'Recientes' },
  ] as const;

  return (
    <div className="min-h-screen bg-[#0F1117] -m-4 lg:-m-6 p-4 lg:p-6 pb-24 lg:pb-6 space-y-5">
      <div>
        <p className="text-xs text-white/40 uppercase tracking-widest mb-0.5">Administración</p>
        <h1 className="text-xl font-black text-white">Insignias</h1>
        <p className="text-xs text-white/40 mt-0.5">{achievements.length} insignias configuradas</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 border border-white/8">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${
              tab === t.key ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'catalog' && (
        <AchievementCatalog achievements={achievements} onToggle={handleToggle} />
      )}

      {tab === 'ranking' && (
        <div className="space-y-1.5">
          {ranking.length > 0 ? ranking.map((r, i) => (
            <div
              key={r.playerId}
              className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/8 px-3 py-2.5"
            >
              <span className={`text-xs font-black w-5 text-center ${
                i === 0 ? 'text-yellow-400' : i === 1 ? 'text-white/60' : i === 2 ? 'text-orange-400' : 'text-white/25'
              }`}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white/90 truncate">{r.playerName}</p>
                <p className="text-[10px] text-white/40">{r.unlockedCount} logros</p>
              </div>
              <span className="text-xs font-bold text-yellow-400">{r.totalPoints} pts</span>
            </div>
          )) : (
            <p className="text-white/30 text-sm text-center py-8">Sin datos aún.</p>
          )}
        </div>
      )}

      {tab === 'recent' && (
        <RecentAchievements events={recent} />
      )}
    </div>
  );
}
