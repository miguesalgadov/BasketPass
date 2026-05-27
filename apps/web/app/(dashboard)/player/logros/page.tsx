'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { PlayerHeaderCard }        from '@/components/modules/achievements/PlayerHeaderCard';
import { AchievementsSummary }     from '@/components/modules/achievements/AchievementsSummary';
import { FeaturedAchievement }     from '@/components/modules/achievements/FeaturedAchievement';
import { AchievementsGrid }        from '@/components/modules/achievements/AchievementsGrid';
import { AchievementUnlockedModal } from '@/components/modules/achievements/AchievementUnlockedModal';
import { ShareableCromoCard }      from '@/components/modules/achievements/ShareableCromoCard';
import { CromoDownloadMenu }       from '@/components/modules/achievements/CromoDownloadMenu';
import { ShareSheetMenu }          from '@/components/modules/achievements/ShareSheetMenu';
import { RecentActivityFeed }      from '@/components/modules/achievements/RecentActivityFeed';
import type {
  Achievement,
  AchievementSummary as SummaryType,
  PlayerProfile,
} from '@/components/modules/achievements/types';
import type { CromoFormat } from '@/components/modules/achievements/ShareableCromoCard';

interface PageData {
  player:       PlayerProfile;
  achievements: Achievement[];
  summary:      SummaryType;
}

export default function PlayerLogrosPage() {
  const [data,         setData]         = useState<PageData | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [modal,        setModal]        = useState<Achievement | null>(null);
  const [cromoFormat,  setCromoFormat]  = useState<CromoFormat>('square');
  const [shareModal,   setShareModal]   = useState(false);

  const cromoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/achievements/player/me')
      .then((r) => {
        const d: PageData = r.data.data;
        setData(d);
        const unread = d.achievements.find((a) => a.status === 'UNLOCKED' && !(a as any).seen);
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

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center">
        <p className="text-white/40 text-sm">Error al cargar los logros.</p>
      </div>
    );
  }

  const featured = data.achievements
    .filter((a) => a.status !== 'LOCKED')
    .sort((a, b) => {
      // Prefer recently unlocked, then highest progress pct
      if (a.status === 'UNLOCKED' && b.status !== 'UNLOCKED') return -1;
      if (b.status === 'UNLOCKED' && a.status !== 'UNLOCKED') return 1;
      const pctA = a.target ? (a.progress ?? 0) / a.target : 0;
      const pctB = b.target ? (b.progress ?? 0) / b.target : 0;
      return pctB - pctA;
    })[0] ?? null;

  return (
    <div className="min-h-screen bg-[#0F1117] -m-4 lg:-m-6 p-4 lg:p-6 pb-24 lg:pb-8">
      {/* Header */}
      <div className="mb-5">
        <p className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5">Mis logros</p>
        <h1 className="text-xl font-black text-white">Insignias y Reconocimientos</h1>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-5">

        {/* ── MAIN COLUMN ── */}
        <div className="flex-1 min-w-0 space-y-5">
          <PlayerHeaderCard
            player={data.player}
            unlockedCount={data.summary.unlockedCount}
            inProgress={data.summary.inProgressCount}
          />

          <AchievementsSummary summary={data.summary} />

          {featured && (
            <FeaturedAchievement
              achievement={featured}
              onShare={() => setShareModal(true)}
            />
          )}

          <AchievementsGrid achievements={data.achievements} />
        </div>

        {/* ── SIDEBAR ── */}
        <aside className="w-full lg:w-72 lg:flex-shrink-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
          {/* Cromo card */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-3 space-y-3">
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">
              Cromo compartible
            </p>

            {featured ? (
              <>
                <ShareableCromoCard
                  achievement={featured}
                  player={data.player}
                  format={cromoFormat}
                  innerRef={cromoRef}
                />
                <CromoDownloadMenu
                  targetRef={cromoRef}
                  onFormatChange={setCromoFormat}
                  achievementName={featured.name}
                />
                <ShareSheetMenu achievement={featured} />
              </>
            ) : (
              <p className="text-[11px] text-white/30 text-center py-8">
                Completa un logro para generar tu cromo.
              </p>
            )}
          </div>

          {/* Activity feed */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-3 space-y-3">
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">
              Actividad reciente
            </p>
            <RecentActivityFeed playerId={data.player.id} limit={3} />
          </div>
        </aside>
      </div>

      {/* Unlocked celebration modal */}
      {modal && (
        <AchievementUnlockedModal
          event={{
            id:           modal.id,
            achievement:  modal,
            unlockedAt:   modal.unlockedAt ?? new Date().toISOString(),
            coachComment: modal.coachComment,
          }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
