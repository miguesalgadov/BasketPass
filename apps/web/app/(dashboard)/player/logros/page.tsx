'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { AchievementsSummary } from '@/components/modules/achievements/AchievementsSummary';
import { AchievementsGrid } from '@/components/modules/achievements/AchievementsGrid';
import { AchievementUnlockedModal } from '@/components/modules/achievements/AchievementUnlockedModal';
import type { Achievement, AchievementSummary } from '@/components/modules/achievements/types';

interface PageData {
  achievements: Achievement[];
  summary:      AchievementSummary;
}

export default function PlayerLogrosPage() {
  const [data,    setData]    = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState<PageData['achievements'][0] | null>(null);

  useEffect(() => {
    api.get('/achievements/player/me')
      .then(async (r) => {
        const d: PageData = r.data.data;
        setData(d);

        // Show modal for the first unread unlocked achievement
        const unread = d.achievements.find(
          (a) => a.status === 'UNLOCKED' && !(a as any).seen
        );
        if (unread) setModal(unread);
      })
      .catch(() => {})
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
    <div className="min-h-screen bg-[#0F1117] -m-4 lg:-m-6 p-4 lg:p-6 pb-24 lg:pb-6 space-y-5">
      <div>
        <p className="text-xs text-white/40 uppercase tracking-widest mb-0.5">Mis logros</p>
        <h1 className="text-xl font-black text-white">Insignias y Reconocimientos</h1>
      </div>

      {data ? (
        <>
          <AchievementsSummary summary={data.summary} />
          <AchievementsGrid achievements={data.achievements} />
        </>
      ) : (
        <p className="text-white/40 text-sm text-center py-12">Error al cargar los logros.</p>
      )}

      {modal && (
        <AchievementUnlockedModal
          event={{
            id:          modal.id,
            achievement: modal,
            unlockedAt:  modal.unlockedAt ?? new Date().toISOString(),
            coachComment: modal.coachComment,
          }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
