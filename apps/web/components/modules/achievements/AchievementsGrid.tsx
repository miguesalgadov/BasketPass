'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { AchievementCard } from './AchievementCard';
import { AchievementCategoryFilter } from './AchievementCategoryFilter';
import type { Achievement, AchievementCategory } from './types';

type FilterValue = 'ALL' | AchievementCategory;

interface AchievementsGridProps {
  achievements: Achievement[];
}

interface SectionProps {
  title:        string;
  count:        number;
  defaultOpen?: boolean;
  children:     React.ReactNode;
}

function Section({ title, count, defaultOpen = true, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full py-2 text-left"
      >
        <span className="text-xs font-semibold text-white/50 uppercase tracking-widest">
          {title} <span className="ml-1 text-white/30">({count})</span>
        </span>
        {open ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
      </button>
      {open && (
        <div className="grid grid-cols-1 gap-2 mt-1">
          {children}
        </div>
      )}
    </div>
  );
}

export function AchievementsGrid({ achievements }: AchievementsGridProps) {
  const [filter, setFilter] = useState<FilterValue>('ALL');

  const visible = filter === 'ALL'
    ? achievements
    : achievements.filter((a) => a.category === filter);

  const unlocked    = visible.filter((a) => a.status === 'UNLOCKED');
  const inProgress  = visible.filter((a) => a.status === 'IN_PROGRESS');
  const locked      = visible.filter((a) => a.status === 'LOCKED' || !a.status);

  return (
    <div className="space-y-4">
      <AchievementCategoryFilter value={filter} onChange={setFilter} />

      <div className="space-y-5">
        {unlocked.length > 0 && (
          <Section title="Desbloqueados" count={unlocked.length} defaultOpen>
            {unlocked.map((a) => <AchievementCard key={a.id} achievement={a} />)}
          </Section>
        )}

        {inProgress.length > 0 && (
          <Section title="En progreso" count={inProgress.length} defaultOpen>
            {inProgress.map((a) => <AchievementCard key={a.id} achievement={a} />)}
          </Section>
        )}

        {locked.length > 0 && (
          <Section title="Bloqueados" count={locked.length} defaultOpen={false}>
            {locked.map((a) => <AchievementCard key={a.id} achievement={a} />)}
          </Section>
        )}

        {visible.length === 0 && (
          <p className="text-center text-white/30 text-sm py-10">Sin logros en esta categoría.</p>
        )}
      </div>
    </div>
  );
}
