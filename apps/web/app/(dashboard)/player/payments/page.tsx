'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, Clock, AlertTriangle, XCircle, ShieldCheck, Stethoscope } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

type FeeStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'NOT_ENROLLED' | 'INJURED' | 'EXEMPT' | 'CANCELLED';

interface Fee {
  id: string;
  year: number;
  month: number;
  amount: number;
  dueDate: string;
  status: FeeStatus;
  paidAt?: string | null;
  paidAmount?: number | null;
  paymentMethod?: string | null;
  notes?: string | null;
  feeType: { name: string; currency: string };
}

const STATUS_CONFIG: Record<FeeStatus, { label: string; color: string; icon: React.ReactNode }> = {
  PAID:         { label: 'Pagada',       color: 'text-success bg-success/10',   icon: <CheckCircle size={13} /> },
  PENDING:      { label: 'Pendiente',    color: 'text-warning bg-warning/10',   icon: <Clock size={13} /> },
  OVERDUE:      { label: 'Vencida',      color: 'text-danger bg-danger/10',     icon: <AlertTriangle size={13} /> },
  NOT_ENROLLED: { label: 'No inscripto', color: 'text-muted-foreground bg-muted', icon: <XCircle size={13} /> },
  INJURED:      { label: 'Lesionado',    color: 'text-blue-500 bg-blue-500/10', icon: <Stethoscope size={13} /> },
  EXEMPT:       { label: 'Exento',       color: 'text-purple-500 bg-purple-500/10', icon: <ShieldCheck size={13} /> },
  CANCELLED:    { label: 'Cancelada',    color: 'text-muted-foreground bg-muted', icon: <XCircle size={13} /> },
};

function FeeStatusBadge({ status }: { status: FeeStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', cfg.color)}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

export default function PlayerPaymentsPage() {
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/fees/me')
      .then((r) => setFees(r.data.data ?? []))
      .catch(() => toast.error('Error al cargar cuotas'))
      .finally(() => setLoading(false));
  }, []);

  // Oldest first (Jan → Dec)
  const sorted = [...fees].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);

  const active  = sorted.filter((f) => !['NOT_ENROLLED', 'CANCELLED', 'EXEMPT'].includes(f.status));
  const paid    = active.filter((f) => f.status === 'PAID');
  const overdue = active.filter((f) => f.status === 'OVERDUE');

  // Only the next upcoming pending/overdue fee
  const nextDue = active.find((f) => ['PENDING', 'OVERDUE'].includes(f.status));
  const currency = fees[0]?.feeType.currency ?? 'CLP';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary">Mis pagos</h1>
        <p className="text-muted-foreground">Historial de cuotas</p>
      </div>

      {/* Summary cards */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-surface rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={15} className="text-warning" />
              <span className="text-xs font-medium text-muted-foreground">Adeudado</span>
            </div>
            {nextDue ? (
              <>
                <p className="text-xl font-bold text-secondary">{formatCurrency(nextDue.amount, nextDue.feeType.currency)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{MONTHS_ES[nextDue.month - 1]} {nextDue.year}</p>
              </>
            ) : (
              <p className="text-xl font-bold text-success">Al día ✓</p>
            )}
          </div>
          <div className="bg-surface rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={15} className="text-success" />
              <span className="text-xs font-medium text-muted-foreground">Pagadas</span>
            </div>
            <p className="text-xl font-bold text-secondary">{paid.length}</p>
          </div>
          <div className="bg-surface rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={15} className="text-danger" />
              <span className="text-xs font-medium text-muted-foreground">Vencidas</span>
            </div>
            <p className="text-xl font-bold text-danger">{overdue.length}</p>
          </div>
        </div>
      )}

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Concepto</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Período</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Monto</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Vencimiento</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  No tenés cuotas registradas
                </td>
              </tr>
            ) : (
              sorted.map((f) => (
                <tr key={f.id} className="border-b border-border hover:bg-muted/40 transition">
                  <td className="px-4 py-3 font-medium text-secondary">{f.feeType.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {MONTHS_ES[f.month - 1]} {f.year}
                  </td>
                  <td className="px-4 py-3 font-semibold text-secondary">
                    {formatCurrency(f.paidAmount ?? f.amount, f.feeType.currency)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {f.status === 'PAID' && f.paidAt ? (
                      <span className="text-success text-xs">Pagado {formatDate(f.paidAt)}</span>
                    ) : (
                      <span className={cn(
                        f.status === 'OVERDUE' ? 'text-danger font-medium' : ''
                      )}>
                        {formatDate(f.dueDate)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <FeeStatusBadge status={f.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
