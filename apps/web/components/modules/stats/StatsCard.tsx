import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  loading?: boolean;
  color?: 'primary' | 'accent' | 'success' | 'warning' | 'danger';
  trend?: { value: number; label: string };
}

const COLOR_CLASSES = {
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-accent/10 text-accent',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
};

export function StatsCard({ title, value, icon, loading, color = 'primary', trend }: StatsCardProps) {
  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border p-5 animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 bg-muted rounded w-24" />
          <div className="w-9 h-9 rounded-lg bg-muted" />
        </div>
        <div className="h-8 bg-muted rounded w-16" />
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl border border-border p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', COLOR_CLASSES[color])}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-secondary">{value}</p>
      {trend && (
        <p className={cn('text-xs mt-1', trend.value >= 0 ? 'text-success' : 'text-danger')}>
          {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
        </p>
      )}
    </div>
  );
}
