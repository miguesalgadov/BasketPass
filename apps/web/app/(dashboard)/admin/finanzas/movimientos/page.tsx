'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Search, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight,
  Minus, Paperclip, X, AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const INCOME_CATEGORIES: Record<string, string> = {
  MONTHLY_FEE:    'Cuota mensual',
  REGISTRATION:   'Inscripción',
  TOURNAMENT_FEE: 'Inscripción torneo',
  SPONSORSHIP:    'Auspicio',
  DONATION:       'Donación',
  SUBSIDY:        'Subvención',
  OTHER_INCOME:   'Otro ingreso',
};

const EXPENSE_CATEGORIES: Record<string, string> = {
  VENUE_RENTAL:     'Arriendo cancha',
  EQUIPMENT:        'Equipamiento',
  TRANSPORT:        'Transporte',
  REFEREE:          'Arbitraje',
  TOURNAMENT_ENTRY: 'Inscripción campeonato',
  COACH_FEE:        'Honorarios entrenador',
  MEDICAL:          'Gastos médicos',
  CLEANING:         'Útiles de aseo',
  ADMIN:            'Administrativos',
  OTHER_EXPENSE:    'Otro egreso',
};

const ALL_CATEGORIES: Record<string, string> = { ...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES, ADJUSTMENT: 'Ajuste' };

function fmtCLP(n: number): string {
  return '$' + Math.abs(n).toLocaleString('es-CL');
}

interface Evidence { id: string; fileName: string; mimeType: string; publicUrl: string }
interface Transaction {
  id: string; type: string; amount: number; concept: string; description?: string;
  category: string; date: string; paymentMethod?: string; referenceNumber?: string;
  balanceAfter: number; source: string; createdBy: string; evidences: Evidence[];
}
interface PageData {
  transactions: Transaction[];
  total: number; page: number; pageSize: number; totalPages: number;
}

function VoidModal({ tx, onClose, onVoided }: { tx: Transaction; onClose: () => void; onVoided: () => void }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleVoid() {
    if (!reason.trim()) { toast.error('Ingresa un motivo'); return; }
    setLoading(true);
    try {
      await api.post(`/finanzas/transactions/${tx.id}/void`, { reason });
      toast.success('Movimiento anulado');
      onVoided();
    } catch {
      toast.error('Error al anular');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-border shadow-xl w-full max-w-md p-6">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-secondary">Anular movimiento</h3>
            <p className="text-xs text-muted-foreground mt-1">
              &ldquo;{tx.concept}&rdquo; — {fmtCLP(tx.amount)}<br />
              El saldo se revertirá automáticamente.
            </p>
          </div>
        </div>
        <textarea
          value={reason} onChange={e => setReason(e.target.value)} rows={2}
          placeholder="Motivo de la anulación..."
          className="w-full px-3 py-2 rounded-lg border border-border text-secondary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary mb-4"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-secondary text-sm font-medium hover:bg-muted/50 transition">
            Cancelar
          </button>
          <button onClick={handleVoid} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition disabled:opacity-50">
            {loading ? 'Anulando...' : 'Anular'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MovimientosPage() {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [type,     setType]     = useState('all');
  const [category, setCategory] = useState('');
  const [search,   setSearch]   = useState('');
  const [page,     setPage]     = useState(1);
  const [data,     setData]     = useState<PageData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [voiding,  setVoiding]  = useState<Transaction | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year: String(year), month: String(month), page: String(page),
        ...(type !== 'all' && { type }),
        ...(category && { category }),
        ...(search && { search }),
      });
      const res = await api.get(`/finanzas/transactions?${params}`);
      setData(res.data.data);
    } catch {
      toast.error('Error al cargar movimientos');
    } finally {
      setLoading(false);
    }
  }, [year, month, type, category, search, page]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [year, month, type, category, search]);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    const cur = new Date(year, month - 1);
    if (cur >= new Date(now.getFullYear(), now.getMonth())) return;
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  return (
    <div className="space-y-4 max-w-4xl">
      {voiding && (
        <VoidModal tx={voiding} onClose={() => setVoiding(null)} onVoided={() => { setVoiding(null); fetchData(); }} />
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-3">
        {/* Month nav */}
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded-lg border border-border hover:bg-muted/50 text-secondary">
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-semibold text-secondary min-w-[130px] text-center">
            {MONTHS[month - 1]} {year}
          </span>
          <button onClick={nextMonth} disabled={new Date(year, month - 1) >= new Date(now.getFullYear(), now.getMonth())}
            className="p-1.5 rounded-lg border border-border hover:bg-muted/50 text-secondary disabled:opacity-40">
            <ChevronRight size={15} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar concepto..."
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-border text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Type filter */}
          <select value={type} onChange={e => setType(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="all">Todos los tipos</option>
            <option value="INCOME">Ingresos</option>
            <option value="EXPENSE">Egresos</option>
            <option value="ADJUSTMENT">Ajustes</option>
          </select>

          {/* Category filter */}
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Todas las categorías</option>
            {Object.entries(ALL_CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data || data.transactions.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">No hay movimientos para este período</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 text-xs text-muted-foreground border-b border-border">
                    <th className="px-4 py-3 text-left font-medium">Fecha</th>
                    <th className="px-4 py-3 text-left font-medium">Concepto</th>
                    <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Categoría</th>
                    <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Método</th>
                    <th className="px-4 py-3 text-right font-medium">Monto</th>
                    <th className="px-4 py-3 text-right font-medium hidden lg:table-cell">Saldo</th>
                    <th className="px-4 py-3 text-center font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.transactions.map(t => (
                    <tr key={t.id} className="hover:bg-muted/20 transition">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(t.date).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0',
                            t.type === 'INCOME'     ? 'bg-emerald-50' :
                            t.type === 'EXPENSE'    ? 'bg-red-50'     : 'bg-muted',
                          )}>
                            {t.type === 'INCOME'
                              ? <ArrowUpRight   size={12} className="text-emerald-600" />
                              : t.type === 'EXPENSE'
                              ? <ArrowDownRight size={12} className="text-red-500" />
                              : <Minus          size={12} className="text-muted-foreground" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-secondary font-medium truncate max-w-[180px]">{t.concept}</p>
                            {t.source !== 'MANUAL' && (
                              <span className="text-[10px] text-muted-foreground">Auto</span>
                            )}
                          </div>
                          {t.evidences.length > 0 && (
                            <Paperclip size={11} className="text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {ALL_CATEGORIES[t.category] ?? t.category}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                        {t.paymentMethod ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                        <span className={
                          t.type === 'INCOME'  ? 'text-emerald-600' :
                          t.type === 'EXPENSE' ? 'text-red-500'     : 'text-muted-foreground'
                        }>
                          {t.type === 'INCOME' ? '+' : t.type === 'EXPENSE' ? '-' : ''}
                          {fmtCLP(t.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground hidden lg:table-cell whitespace-nowrap">
                        {fmtCLP(t.balanceAfter)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => setVoiding(t)} title="Anular"
                          className="p-1 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-500 transition">
                          <X size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground">
                <span>{data.total} movimientos</span>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-2 py-1 rounded border border-border disabled:opacity-40 hover:bg-muted/50">
                    ←
                  </button>
                  <span className="px-3 py-1">{page}/{data.totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}
                    className="px-2 py-1 rounded border border-border disabled:opacity-40 hover:bg-muted/50">
                    →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
