import { cn } from '@/lib/utils';
import { CATEGORY_CONFIG } from './types';
import type { AchievementCategory } from './types';

type FilterValue = 'ALL' | AchievementCategory;

interface AchievementCategoryFilterProps {
  value:    FilterValue;
  onChange: (v: FilterValue) => void;
}

const ALL_FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'ALL',           label: 'Todos' },
  { value: 'IDENTITY',      label: 'Identidad' },
  { value: 'ATTENDANCE',    label: 'Asistencia' },
  { value: 'OFFENSE',       label: 'Ofensiva' },
  { value: 'DEFENSE',       label: 'Defensa' },
  { value: 'TEAMPLAY',      label: 'Colectivo' },
  { value: 'PARTICIPATION', label: 'Participación' },
  { value: 'COACH',         label: 'Coach' },
  { value: 'SEASON',        label: 'Temporada' },
];

export function AchievementCategoryFilter({ value, onChange }: AchievementCategoryFilterProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
      {ALL_FILTERS.map((f) => {
        const active = value === f.value;
        const color  = f.value !== 'ALL' ? CATEGORY_CONFIG[f.value as AchievementCategory].color : undefined;
        return (
          <button
            key={f.value}
            onClick={() => onChange(f.value)}
            className={cn(
              'flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition border',
              active ? 'text-white' : 'text-white/40 border-white/10 bg-white/[0.03] hover:text-white/70',
            )}
            style={active ? { background: (color ?? '#FF5A00') + '33', borderColor: (color ?? '#FF5A00') + '66', color: color ?? '#FF5A00' } : {}}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
