'use client';

import { useState } from 'react';
import { AchievementCard } from './AchievementCard';
import { AchievementCategoryFilter } from './AchievementCategoryFilter';
import type { Achievement, AchievementCategory } from './types';

type FilterValue = 'ALL' | AchievementCategory;

interface AchievementsGridProps {
  achievements: Achievement[];
}

export function AchievementsGrid({ achievements }: AchievementsGridProps) {
  const [filter, setFilter] = useState<FilterValue>('ALL');

  const visible = filter === 'ALL'
    ? achievements
    : achievements.filter((a) => a.category === filter);

  const unlocked   = visible.filter((a) => a.status === 'UNLOCKED');
  const inProgress = visible.filter((a) => a.status === 'IN_PROGRESS');
  const locked     = visible.filter((a) => a.status === 'LOCKED' || !a.status);

  return (
    <div className="space-y-5">
      <AchievementCategoryFilter value={filter} onChange={setFilter} />

      {unlocked.length > 0 && (
        <section>
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-2">
            Desbloqueados ({unlocked.length})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {unlocked.map((a) => <AchievementCard key={a.id} achievement={a} />)}
          </div>
        </section>
      )}

      {inProgress.length > 0 && (
        <section>
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-2">
            En progreso ({inProgress.length})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {inProgress.map((a) => <AchievementCard key={a.id} achievement={a} />)}
          </div>
        </section>
      )}

      {locked.length > 0 && (
        <section>
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-2">
            Bloqueados ({locked.length})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {locked.map((a) => <AchievementCard key={a.id} achievement={a} />)}
          </div>
        </section>
      )}

      {visible.length === 0 && (
        <p className="text-center text-white/30 text-sm py-10">Sin logros en esta categoría.</p>
      )}
    </div>
  );
}
