import { cn } from '@/lib/utils';
import type { AchievementCategory } from './types';
import { CATEGORY_CONFIG } from './types';

interface AchievementProgressBarProps {
  progress:   number;
  target:     number;
  category:   AchievementCategory;
  metric?:    string | null;
  className?: string;
  compact?:   boolean;
}

const METRIC_LABEL: Record<string, string> = {
  attendance_count:       'entrenamientos',
  monthly_attendance_pct: '%',
  season_attendance_pct:  '%',
  matches_played:         'partidos',
  points_total:           'puntos',
  threes_total:           'triples',
  assists_total:          'asistencias',
};

export function AchievementProgressBar({ progress, target, category, metric, className, compact }: AchievementProgressBarProps) {
  const pct = Math.min(100, Math.round((progress / target) * 100));
  const { color } = CATEGORY_CONFIG[category];
  const unit = metric ? (METRIC_LABEL[metric] ?? '') : '';

  return (
    <div className={cn('space-y-1', className)}>
      {!compact && (
        <div className="flex items-center justify-between text-[10px] text-white/40">
          <span>{progress} / {target} {unit}</span>
          <span>{pct}%</span>
        </div>
      )}
      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
