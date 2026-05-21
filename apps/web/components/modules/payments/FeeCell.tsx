'use client';

import { cn } from '@/lib/utils';

export type FeeStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'NOT_ENROLLED' | 'INJURED' | 'EXEMPT' | 'CANCELLED';

export const STATUS_CONFIG: Record<FeeStatus, { label: string; bg: string; text: string; border: string }> = {
  PAID:         { label: 'Pagado',       bg: 'bg-success/20',   text: 'text-success',   border: 'border-success/30'   },
  PENDING:      { label: 'Pendiente',    bg: 'bg-warning/20',   text: 'text-warning',   border: 'border-warning/30'   },
  OVERDUE:      { label: 'Atrasado',     bg: 'bg-danger/20',    text: 'text-danger',    border: 'border-danger/30'    },
  NOT_ENROLLED: { label: 'No inscrito',  bg: 'bg-primary/10',   text: 'text-primary',   border: 'border-primary/20'   },
  INJURED:      { label: 'Lesionado',    bg: 'bg-purple-500/15',text: 'text-purple-500',border: 'border-purple-500/25'},
  EXEMPT:       { label: 'Exento',       bg: 'bg-muted/60',     text: 'text-muted-foreground', border: 'border-border' },
  CANCELLED:    { label: 'Cancelado',    bg: 'bg-muted/40',     text: 'text-muted-foreground', border: 'border-border' },
};

export interface FeeData {
  id: string;
  status: FeeStatus;
  amount: number;
  dueDate: string;
  paidAt?: string | null;
  paidAmount?: number | null;
  paymentMethod?: string | null;
  notes?: string | null;
}

interface Props {
  fee:            FeeData | null;
  onClick:        (fee: FeeData) => void;
  selected?:      boolean;
  selectionMode?: boolean;
}

function fmtDate(s?: string | null) {
  if (!s) return '';
  return new Date(s).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
}

export function FeeCell({ fee, onClick, selected, selectionMode }: Props) {
  if (!fee) return <div className="h-7 rounded bg-muted/20" />;

  const cfg = STATUS_CONFIG[fee.status] ?? STATUS_CONFIG.PENDING;

  const tip = fee.status === 'PAID'
    ? `Pagado el ${fmtDate(fee.paidAt)} — $${(fee.paidAmount ?? fee.amount).toLocaleString('es-CL')}`
    : `Vence: ${fmtDate(fee.dueDate)} — $${fee.amount.toLocaleString('es-CL')}`;

  return (
    <button
      onClick={() => !selectionMode && onClick(fee)}
      title={tip}
      className={cn(
        'w-full h-7 rounded text-[10px] font-semibold border transition-all',
        !selectionMode && 'hover:scale-105 hover:brightness-110 active:scale-95',
        cfg.bg, cfg.text, cfg.border,
        selected && 'ring-2 ring-primary ring-offset-1 brightness-95',
      )}
    >
      {selected ? '✓' : cfg.label}
    </button>
  );
}
