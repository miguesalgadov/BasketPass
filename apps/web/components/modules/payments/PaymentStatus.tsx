import { cn } from '@/lib/utils';

type Status = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED';

const STATUS_CONFIG: Record<Status, { label: string; className: string }> = {
  PENDING:   { label: 'Pendiente',   className: 'bg-warning/10 text-warning' },
  PAID:      { label: 'Pagado',      className: 'bg-success/10 text-success' },
  OVERDUE:   { label: 'Vencido',     className: 'bg-danger/10 text-danger' },
  CANCELLED: { label: 'Cancelado',   className: 'bg-muted text-muted-foreground' },
  REFUNDED:  { label: 'Reembolsado', className: 'bg-accent/10 text-accent' },
};

export function PaymentStatus({ status }: { status: Status }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return (
    <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', config.className)}>
      {config.label}
    </span>
  );
}
