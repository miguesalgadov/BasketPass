import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface AchievementKPICardProps {
  icon:        LucideIcon;
  iconColor:   string;
  value:       string | number;
  label:       string;
  sub?:        string;
  progress?:   number;       // 0-100
  progressColor?: string;
  cta?:        string;
  onCta?:      () => void;
  className?:  string;
}

export function AchievementKPICard({
  icon: Icon,
  iconColor,
  value,
  label,
  sub,
  progress,
  progressColor,
  cta,
  onCta,
  className,
}: AchievementKPICardProps) {
  return (
    <div
      className={cn(
        'rounded-xl bg-white/[0.04] border border-white/8 p-3 flex flex-col gap-1.5',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <Icon size={15} style={{ color: iconColor }} />
        {cta && (
          <button
            onClick={onCta}
            className="text-[9px] text-white/30 hover:text-white/60 transition-colors"
          >
            {cta} →
          </button>
        )}
      </div>

      <div>
        <p className="text-xl font-black text-white leading-none">{value}</p>
        <p className="text-[10px] text-white/40 mt-0.5">{label}</p>
      </div>

      {progress !== undefined && (
        <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden mt-0.5">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progress}%`, background: progressColor ?? '#A855F7' }}
          />
        </div>
      )}

      {sub && (
        <p className="text-[9px] text-white/30">{sub}</p>
      )}
    </div>
  );
}
