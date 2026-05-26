'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export type PaymentStatusLevel = 'OK' | 'WARNING' | 'DANGER';

interface Fee { status: string; amount: number; paidAmount?: number | null; month: number; year: number }

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const CONFIG: Record<PaymentStatusLevel, {
  container: string; dot: string; title: string; titleColor: string;
  cta: string; ctaClass: string;
  subtitle: (fees: Fee[]) => string;
}> = {
  OK: {
    container:  'bg-green-500/10 border-green-500/25',
    dot:        'bg-green-500 ring-4 ring-green-500/20',
    title:      'Cuotas al día ✓',
    titleColor: 'text-green-400',
    cta:        'Ver historial',
    ctaClass:   'bg-green-500/15 text-green-400 hover:bg-green-500/25',
    subtitle: (fees) => {
      const last = fees.find((f) => f.status === 'PAID');
      if (!last) return 'Sin deuda pendiente';
      const fmt = last.paidAmount ?? last.amount;
      return `Último pago: ${MONTHS[last.month - 1]} ${last.year} · $${fmt.toLocaleString('es-CL')}`;
    },
  },
  WARNING: {
    container:  'bg-amber-500/10 border-amber-500/25',
    dot:        'bg-amber-400 ring-4 ring-amber-400/20',
    title:      'Tienes una cuota atrasada',
    titleColor: 'text-amber-400',
    cta:        'Pagar ahora',
    ctaClass:   'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25',
    subtitle: (fees) => {
      const overdue = fees.filter((f) => f.status === 'OVERDUE');
      const total = overdue.reduce((a, f) => a + f.amount, 0);
      return `${overdue.length} cuota pendiente · Total: $${total.toLocaleString('es-CL')}`;
    },
  },
  DANGER: {
    container:  'bg-red-500/10 border-red-500/25',
    dot:        'bg-red-500 ring-4 ring-red-500/20 animate-pulse',
    title:      '¡Deuda acumulada — regulariza tu situación!',
    titleColor: 'text-red-400',
    cta:        'Regularizar',
    ctaClass:   'bg-red-500/15 text-red-400 hover:bg-red-500/25',
    subtitle: (fees) => {
      const overdue = fees.filter((f) => f.status === 'OVERDUE');
      const total = overdue.reduce((a, f) => a + f.amount, 0);
      return `${overdue.length} cuotas sin pagar · Total: $${total.toLocaleString('es-CL')}`;
    },
  },
};

export function PaymentStatusBadge({ status, fees }: { status: PaymentStatusLevel; fees: Fee[] }) {
  const router = useRouter();
  const cfg = CONFIG[status];

  return (
    <button
      onClick={() => router.push('/player/payments')}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all active:scale-[0.98] text-left',
        cfg.container
      )}
    >
      <div className={cn('w-3.5 h-3.5 rounded-full flex-shrink-0', cfg.dot)} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold', cfg.titleColor)}>{cfg.title}</p>
        <p className="text-xs text-white/40 mt-0.5 truncate">{cfg.subtitle(fees)}</p>
      </div>
      <span className={cn('text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0 transition', cfg.ctaClass)}>
        {cfg.cta}
      </span>
    </button>
  );
}
