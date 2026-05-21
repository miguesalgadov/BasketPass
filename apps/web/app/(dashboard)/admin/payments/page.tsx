'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw, Download, Zap, ChevronLeft, ChevronRight,
  CheckCircle2, Clock, AlertTriangle, TrendingUp, Settings, Plus, X,
  CheckSquare, Square, Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { FeeCell, FeeData, FeeStatus, STATUS_CONFIG } from '@/components/modules/payments/FeeCell';
import { FeePaymentModal } from '@/components/modules/payments/FeePaymentModal';

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

interface FeeType { id: string; name: string; amount: number; currency: string }
interface Team    { id: string; name: string; category: string }

interface MatrixPlayer {
  id:           string;
  firstName:    string;
  lastName:     string;
  email:        string;
  jerseyNumber: number | null;
  height:       number | null;
  teamId:       string | null;
  fees:         Record<number, FeeData | null>;
  totalPaid:    number;
}

interface MatrixData {
  year:       number;
  feeTypes:   FeeType[];
  feeType:    FeeType | null;
  players:    MatrixPlayer[];
  totals: {
    totalCharged: number;
    totalPending: number;
    overdueCount: number;
    paymentRate:  number;
    byMonth: Record<number, { charged: number; pending: number; paid: number; overdue: number; total: number }>;
  };
}

function fmtCLP(n: number) {
  return '$' + n.toLocaleString('es-CL');
}

export default function PaymentsPage() {
  const [year, setYear]         = useState(new Date().getFullYear());
  const [teams, setTeams]       = useState<Team[]>([]);
  const [teamId, setTeamId]     = useState('');
  const [feeTypeId, setFeeTypeId] = useState('');
  const [data, setData]         = useState<MatrixData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [generating, setGenerating] = useState(false);

  const [selectedFeeId, setSelectedFeeId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [selectedMonths, setSelectedMonths] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<FeeStatus>('EXEMPT');
  const [bulkNotes, setBulkNotes] = useState('');
  const [applyingBulk, setApplyingBulk] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [feeTypeModal, setFeeTypeModal] = useState(false);
  const [ftForm, setFtForm] = useState({ name: '', amount: '', currency: 'ARS', dueDayOfMonth: '5', isRecurring: true });
  const [savingFt, setSavingFt] = useState(false);
  const [deletingFtId, setDeletingFtId] = useState<string | null>(null);

  const fetchMatrix = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/fees/matrix', {
        params: { year, teamId: teamId || undefined, feeTypeId: feeTypeId || undefined },
      });
      setData(res.data.data);
    } catch {
      toast.error('Error al cargar la matriz de pagos');
    } finally {
      setLoading(false);
    }
  }, [year, teamId, feeTypeId]);

  useEffect(() => {
    api.get('/teams').then((r) => setTeams(r.data.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => { fetchMatrix(); }, [fetchMatrix]);

  const generateMonthly = async () => {
    const month = new Date().getMonth() + 1;
    setGenerating(true);
    try {
      const res = await api.post('/fees/generate-monthly', { year, month });
      toast.success(`${res.data.data.created} cuotas generadas para ${MONTHS[month - 1]} ${year}`);
      fetchMatrix();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Error al generar cuotas');
    } finally { setGenerating(false); }
  };

  const generateYear = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/fees/generate-year', { year });
      toast.success(`${res.data.data.created} cuotas generadas para ${year}`);
      fetchMatrix();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Error al generar cuotas');
    } finally { setGenerating(false); }
  };

  const exportCSV = () => {
    if (!data) return;
    const headers = ['N°', 'Apellido', 'Nombre', 'N° Cam.', ...MONTHS.map((m, i) => `${m}-${String(year).slice(2)}`), 'Total pagado'];
    const rows = data.players.map((p, i) => [
      i + 1, p.lastName, p.firstName, p.jerseyNumber ?? '',
      ...[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => p.fees[m]?.status ?? ''),
      fmtCLP(p.totalPaid),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `cuotas-${year}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const createFeeType = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingFt(true);
    try {
      await api.post('/fee-types', {
        name:          ftForm.name.trim(),
        amount:        Number(ftForm.amount),
        currency:      ftForm.currency,
        dueDayOfMonth: Number(ftForm.dueDayOfMonth),
        isRecurring:   ftForm.isRecurring,
      });
      toast.success('Tipo de cuota creado');
      setFeeTypeModal(false);
      setFtForm({ name: '', amount: '', currency: 'ARS', dueDayOfMonth: '5', isRecurring: true });
      fetchMatrix();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Error al crear');
    } finally {
      setSavingFt(false);
    }
  };

  const deleteFeeType = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar el tipo de cuota "${name}" y todas sus cuotas generadas? Esta acción no se puede deshacer.`)) return;
    setDeletingFtId(id);
    try {
      await api.delete(`/fee-types/${id}`);
      toast.success(`Tipo de cuota "${name}" eliminado`);
      if (feeTypeId === id) setFeeTypeId('');
      fetchMatrix();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Error al eliminar');
    } finally {
      setDeletingFtId(null);
    }
  };

  const getIntersectionFeeIds = (): string[] => {
    if (!data || selectedPlayerIds.size === 0 || selectedMonths.size === 0) return [];
    const ids: string[] = [];
    for (const player of data.players) {
      if (!selectedPlayerIds.has(player.id)) continue;
      for (const month of selectedMonths) {
        const fee = player.fees[month];
        if (fee) ids.push(fee.id);
      }
    }
    return ids;
  };

  const togglePlayer = (player: MatrixPlayer) => {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      next.has(player.id) ? next.delete(player.id) : next.add(player.id);
      return next;
    });
  };

  const toggleMonth = (month: number) => {
    setSelectedMonths((prev) => {
      const next = new Set(prev);
      next.has(month) ? next.delete(month) : next.add(month);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedPlayerIds(new Set());
    setSelectedMonths(new Set());
  };

  const allSelected = !!data && data.players.length > 0 && data.players.every((p) => selectedPlayerIds.has(p.id));

  const toggleSelectAll = () => {
    if (!data) return;
    setSelectedPlayerIds(allSelected ? new Set() : new Set(data.players.map((p) => p.id)));
  };

  const handleBulkApply = async () => {
    const feeIds = getIntersectionFeeIds();
    if (feeIds.length === 0) return;
    setApplyingBulk(true);
    try {
      const res = await api.post('/fees/bulk-update', {
        feeIds,
        status: bulkStatus,
        notes:  bulkNotes || undefined,
      });
      toast.success(`${res.data.data.updated} cuota${res.data.data.updated !== 1 ? 's' : ''} actualizadas`);
      clearSelection();
      setSelectionMode(false);
      setBulkNotes('');
      fetchMatrix();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Error al actualizar');
    } finally {
      setApplyingBulk(false);
    }
  };

  const handleBulkDelete = async () => {
    const feeIds = getIntersectionFeeIds();
    if (feeIds.length === 0) return;
    if (!confirm(`¿Eliminar ${feeIds.length} cuota${feeIds.length !== 1 ? 's' : ''}? Las cuotas pagadas no serán eliminadas.`)) return;
    setDeletingBulk(true);
    try {
      const res = await api.post('/fees/bulk-delete', { feeIds });
      const { deleted, skipped } = res.data.data;
      toast.success(`${deleted} cuota${deleted !== 1 ? 's' : ''} eliminada${deleted !== 1 ? 's' : ''}${skipped > 0 ? ` · ${skipped} pagada${skipped !== 1 ? 's' : ''} omitida${skipped !== 1 ? 's' : ''}` : ''}`);
      clearSelection();
      setSelectionMode(false);
      fetchMatrix();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Error al eliminar');
    } finally {
      setDeletingBulk(false);
    }
  };

  const totals = data?.totals;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary">Cuotas</h1>
          <p className="text-muted-foreground text-sm">Matriz de cuotas — vista anual</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setSelectionMode((m) => !m); clearSelection(); }}
            className={cn(
              'flex items-center gap-2 border font-medium py-2 px-3 rounded-lg transition text-sm',
              selectionMode
                ? 'bg-primary border-primary text-white'
                : 'border-border hover:bg-muted text-secondary',
            )}>
            <CheckSquare size={14} /> {selectionMode ? 'Cancelar selección' : 'Seleccionar'}
          </button>
          {selectionMode && (
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 border border-border hover:bg-muted text-secondary font-medium py-2 px-3 rounded-lg transition text-sm">
              {allSelected
                ? <><Square size={14} /> Deseleccionar todos</>
                : <><CheckSquare size={14} /> Seleccionar todos</>}
            </button>
          )}
          <button onClick={() => setFeeTypeModal(true)}
            className="flex items-center gap-2 border border-border hover:bg-muted text-secondary font-medium py-2 px-3 rounded-lg transition text-sm">
            <Plus size={14} /> Tipo de cuota
          </button>
          <button onClick={exportCSV} disabled={!data}
            className="flex items-center gap-2 border border-border hover:bg-muted text-secondary font-medium py-2 px-3 rounded-lg transition text-sm disabled:opacity-50">
            <Download size={14} /> Exportar CSV
          </button>
          <button onClick={generateMonthly} disabled={generating}
            className="flex items-center gap-2 border border-border hover:bg-muted text-secondary font-medium py-2 px-3 rounded-lg transition text-sm disabled:opacity-50">
            {generating ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
            Generar mes
          </button>
          <button onClick={generateYear} disabled={generating}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold py-2 px-3 rounded-lg transition text-sm disabled:opacity-50">
            {generating ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
            Generar año
          </button>
        </div>
      </div>

      {/* KPI cards */}
      {totals && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard icon={<CheckCircle2 size={15} />} label="Total recaudado"  value={fmtCLP(totals.totalCharged)} color="text-emerald-600" />
          <KpiCard icon={<Clock size={15} />}         label="Por recaudar"    value={fmtCLP(totals.totalPending)} color="text-amber-500" />
          <KpiCard icon={<AlertTriangle size={15} />} label="Cuotas vencidas" value={String(totals.overdueCount)} color="text-red-500" />
          <KpiCard icon={<TrendingUp size={15} />}    label="Tasa de pago"    value={`${totals.paymentRate}%`}    color="text-primary" />
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 border border-border rounded-lg overflow-hidden">
          <button onClick={() => setYear(y => y - 1)} className="px-2 py-1.5 hover:bg-muted transition text-muted-foreground hover:text-secondary">
            <ChevronLeft size={16} />
          </button>
          <span className="px-3 py-1.5 text-sm font-semibold text-secondary">{year}</span>
          <button onClick={() => setYear(y => y + 1)} className="px-2 py-1.5 hover:bg-muted transition text-muted-foreground hover:text-secondary">
            <ChevronRight size={16} />
          </button>
        </div>

        {teams.length > 0 && (
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)}
            className="px-3 py-1.5 border border-border rounded-lg bg-white text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary transition">
            <option value="">Todos los equipos</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.category}</option>)}
          </select>
        )}

        {data?.feeTypes && data.feeTypes.length > 1 && (
          <select value={feeTypeId} onChange={(e) => setFeeTypeId(e.target.value)}
            className="px-3 py-1.5 border border-border rounded-lg bg-white text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary transition">
            <option value="">Tipo de cuota...</option>
            {data.feeTypes.map((ft) => <option key={ft.id} value={ft.id}>{ft.name}</option>)}
          </select>
        )}

        {data?.feeType && (
          <span className="text-xs text-muted-foreground">
            {data.feeType.name} · {fmtCLP(data.feeType.amount)} {data.feeType.currency}
          </span>
        )}
      </div>

      {/* Matrix table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-border h-64 flex items-center justify-center text-muted-foreground text-sm">
          <RefreshCw size={18} className="animate-spin mr-2" /> Cargando...
        </div>
      ) : !data?.feeType ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center space-y-3">
          <Settings size={32} className="mx-auto text-muted-foreground" />
          <p className="text-secondary font-medium">Sin tipos de cuota configurados</p>
          <p className="text-sm text-muted-foreground">
            Creá un tipo de cuota (ej: &quot;Cuota mensual&quot;) y luego generá las cuotas del año.
          </p>
          <button onClick={() => setFeeTypeModal(true)}
            className="mx-auto flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-semibold py-2 px-4 rounded-lg transition">
            <Plus size={14} /> Crear tipo de cuota
          </button>
        </div>
      ) : data.players.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center text-muted-foreground">
          Sin cuotas generadas para {year}. Hacé clic en «Generar año».
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">

          {/* Month selector — only visible in selection mode */}
          {selectionMode && (
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-primary/5">
              <span className="text-xs font-semibold text-secondary shrink-0">Meses:</span>
              <div className="flex flex-wrap gap-1.5">
                {MONTHS.map((m, i) => {
                  const month = i + 1;
                  const isSelected = selectedMonths.has(month);
                  return (
                    <button
                      key={month}
                      type="button"
                      onClick={() => toggleMonth(month)}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-semibold border transition',
                        isSelected
                          ? 'bg-primary border-primary text-white'
                          : 'bg-white border-border text-muted-foreground hover:border-primary hover:text-primary',
                      )}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-8">#</th>
                  <th className="sticky left-8 z-10 bg-muted/50 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground min-w-[150px]">Jugador</th>
                  <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center w-10">#</th>
                  {MONTHS.map((m, i) => {
                    const month = i + 1;
                    const isMonthSelected = selectedMonths.has(month);
                    return (
                      <th
                        key={i}
                        className={cn(
                          'px-1 py-2 text-[10px] font-semibold uppercase tracking-wider text-center min-w-[78px]',
                          isMonthSelected ? 'text-primary bg-primary/10' : 'text-muted-foreground',
                        )}
                      >
                        {m}
                      </th>
                    );
                  })}
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right min-w-[90px]">Pagado</th>
                </tr>
              </thead>
              <tbody>
                {data.players.map((player, idx) => (
                  <tr key={player.id} className="border-b border-border hover:bg-muted/30 transition group">
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground font-mono">{idx + 1}</td>
                    <td className="sticky left-8 z-10 bg-white group-hover:bg-muted/30 px-3 py-1.5">
                      <div className="flex items-center gap-1.5">
                        {selectionMode && (
                          <button
                            type="button"
                            onClick={() => togglePlayer(player)}
                            className="flex-shrink-0 p-0.5 rounded hover:bg-primary/10 transition"
                          >
                            {selectedPlayerIds.has(player.id)
                              ? <CheckSquare size={13} className="text-primary" />
                              : <Square size={13} className="text-muted-foreground/40" />}
                          </button>
                        )}
                        <div>
                          <p className="font-semibold text-secondary text-xs leading-tight truncate max-w-[130px]">{player.lastName}</p>
                          <p className="text-[10px] text-muted-foreground">{player.firstName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className="font-bold text-amber-500 font-mono text-xs">{player.jerseyNumber ?? '—'}</span>
                    </td>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map((month) => (
                      <td key={month} className="px-1 py-1.5">
                        <FeeCell
                          fee={player.fees[month] ?? null}
                          onClick={(f) => setSelectedFeeId(f.id)}
                          selectionMode={selectionMode}
                          selected={selectionMode && selectedPlayerIds.has(player.id) && selectedMonths.has(month)}
                        />
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-right">
                      <span className="text-xs font-semibold text-emerald-600">{fmtCLP(player.totalPaid)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr className="border-t-2 border-border bg-muted/60">
                  <td colSpan={3} className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wide">Totales</td>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map((month) => {
                    const m = totals?.byMonth[month];
                    return (
                      <td key={month} className="px-1 py-2 text-center">
                        <div className="text-[10px] font-bold text-emerald-600 leading-tight">{fmtCLP(m?.charged ?? 0)}</div>
                        <div className="text-[9px] text-muted-foreground">{m?.paid ?? 0} pagados</div>
                        {(m?.overdue ?? 0) > 0 && (
                          <div className="text-[9px] text-red-500">{m!.overdue} vencidos</div>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right">
                    <span className="text-sm font-bold text-emerald-600">{fmtCLP(totals?.totalCharged ?? 0)}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap">
        {(Object.entries(STATUS_CONFIG) as [FeeStatus, typeof STATUS_CONFIG[FeeStatus]][]).map(([key, cfg]) => (
          <span key={key} className={cn('text-[10px] px-2 py-1 rounded-full font-semibold', cfg.bg, cfg.text)}>
            {cfg.label}
          </span>
        ))}
      </div>

      <FeePaymentModal feeId={selectedFeeId} onClose={() => setSelectedFeeId(null)} onUpdate={fetchMatrix} />

      {/* Bulk action bar */}
      {selectionMode && (selectedPlayerIds.size > 0 || selectedMonths.size > 0) && (() => {
        const intersectionCount = getIntersectionFeeIds().length;
        return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white border border-border shadow-2xl rounded-2xl px-5 py-3">
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-secondary whitespace-nowrap">
              {selectedPlayerIds.size} jugador{selectedPlayerIds.size !== 1 ? 'es' : ''}
              {' · '}
              {selectedMonths.size} mes{selectedMonths.size !== 1 ? 'es' : ''}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {intersectionCount > 0 ? `${intersectionCount} cuota${intersectionCount !== 1 ? 's' : ''} a modificar` : 'Sin intersección'}
            </span>
          </div>
          <div className="w-px h-5 bg-border" />
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value as FeeStatus)}
            className="px-3 py-1.5 border border-border rounded-lg bg-white text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {(Object.entries(STATUS_CONFIG) as [FeeStatus, typeof STATUS_CONFIG[FeeStatus]][]).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
          <input
            value={bulkNotes}
            onChange={(e) => setBulkNotes(e.target.value)}
            placeholder="Nota (opcional)"
            className="px-3 py-1.5 border border-border rounded-lg bg-white text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary w-36"
          />
          <button
            onClick={handleBulkApply}
            disabled={applyingBulk || deletingBulk || intersectionCount === 0}
            className="px-4 py-1.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg text-sm transition disabled:opacity-40 whitespace-nowrap"
          >
            {applyingBulk ? 'Aplicando...' : 'Aplicar'}
          </button>
          <div className="w-px h-5 bg-border" />
          <button
            onClick={handleBulkDelete}
            disabled={deletingBulk || applyingBulk || intersectionCount === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg text-sm transition disabled:opacity-40 whitespace-nowrap"
            title="Eliminar cuotas seleccionadas"
          >
            <Trash2 size={13} />
            {deletingBulk ? 'Eliminando...' : 'Eliminar'}
          </button>
          <button
            onClick={clearSelection}
            className="p-1.5 text-muted-foreground hover:text-secondary hover:bg-muted rounded-lg transition"
            title="Limpiar selección"
          >
            <X size={14} />
          </button>
        </div>
        );
      })()}

      {/* Manage FeeTypes modal */}
      {feeTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-border shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-secondary">Tipos de cuota</h2>
              <button onClick={() => setFeeTypeModal(false)} className="text-muted-foreground hover:text-secondary transition">
                <X size={18} />
              </button>
            </div>

            {/* Existing fee types list */}
            {data?.feeTypes && data.feeTypes.length > 0 && (
              <div className="px-6 pt-4 pb-2 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Existentes</p>
                {data.feeTypes.map((ft) => (
                  <div key={ft.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-secondary truncate">{ft.name}</p>
                      <p className="text-xs text-muted-foreground">{fmtCLP(ft.amount)} {ft.currency} · vence día {(ft as any).dueDayOfMonth}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteFeeType(ft.id, ft.name)}
                      disabled={deletingFtId === ft.id}
                      className="flex-shrink-0 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-40"
                      title="Eliminar tipo de cuota"
                    >
                      {deletingFtId === ft.id ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                ))}
                <div className="border-t border-border pt-3 mt-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Nuevo tipo</p>
                </div>
              </div>
            )}

            <form onSubmit={createFeeType} className="px-6 pb-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Nombre</label>
                <input required value={ftForm.name} onChange={(e) => setFtForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Cuota mensual"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Monto</label>
                  <input required type="number" min="1" value={ftForm.amount}
                    onChange={(e) => setFtForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="5000"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Moneda</label>
                  <select value={ftForm.currency} onChange={(e) => setFtForm((f) => ({ ...f, currency: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="ARS">ARS</option>
                    <option value="CLP">CLP</option>
                    <option value="USD">USD</option>
                    <option value="UYU">UYU</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Día de vencimiento</label>
                  <input required type="number" min="1" max="28" value={ftForm.dueDayOfMonth}
                    onChange={(e) => setFtForm((f) => ({ ...f, dueDayOfMonth: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={ftForm.isRecurring}
                      onChange={(e) => setFtForm((f) => ({ ...f, isRecurring: e.target.checked }))}
                      className="w-4 h-4 accent-primary" />
                    <span className="text-sm text-secondary">Recurrente</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setFeeTypeModal(false)}
                  className="px-4 py-2 border border-border rounded-lg text-sm text-secondary hover:bg-muted transition">
                  Cancelar
                </button>
                <button type="submit" disabled={savingFt}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg text-sm transition disabled:opacity-60">
                  {savingFt ? 'Guardando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
      <div className={cn('flex items-center gap-1.5 mb-1 text-xs font-medium', color)}>
        {icon} {label}
      </div>
      <p className="text-xl font-bold text-secondary">{value}</p>
    </div>
  );
}
