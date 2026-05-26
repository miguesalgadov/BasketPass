'use client';

import { useEffect, useState, useMemo } from 'react';
import { Download } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

type Tab = 'financial' | 'attendance' | 'performance';

interface Payment {
  id: string; amount: number; currency: string; status: string;
  concept: string; createdAt: string; paidAt?: string;
  player?: { user: { firstName: string; lastName: string } };
}
interface MonthBucket { month: string; billed: number; collected: number; pending: number; overdue: number; count: number; }

interface AttendanceRow {
  player: { id: string; jerseyNumber?: number; position?: string; user: { firstName: string; lastName: string }; team?: { name: string; category: string } };
  total: number; present: number; late: number; absent: number; excused: number; percentage: number | null;
}

interface PerfRow {
  player: { id: string; jerseyNumber?: number; position?: string; user: { firstName: string; lastName: string }; team?: { name: string } };
  gamesPlayed: number;
  averages: { points?: number | null; rebounds?: number | null; assists?: number | null; steals?: number | null; blocks?: number | null };
}

function avg(v?: number | null) { return v != null ? v.toFixed(1) : '—'; }

function exportCSV(rows: string[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('financial');

  const [payments, setPayments]     = useState<Payment[]>([]);
  const [loadingFin, setLoadingFin] = useState(false);
  const [finLoaded, setFinLoaded]   = useState(false);

  const [attStats, setAttStats]     = useState<AttendanceRow[]>([]);
  const [loadingAtt, setLoadingAtt] = useState(false);
  const [attLoaded, setAttLoaded]   = useState(false);

  const [teams, setTeams]           = useState<any[]>([]);
  const [perfTeamId, setPerfTeamId] = useState('');
  const [perfRows, setPerfRows]     = useState<PerfRow[]>([]);
  const [loadingPerf, setLoadingPerf] = useState(false);

  useEffect(() => {
    if (tab === 'financial' && !finLoaded) {
      setLoadingFin(true);
      api.get('/payments')
        .then((r) => { setPayments(r.data.data ?? []); setFinLoaded(true); })
        .catch(() => toast.error('Error al cargar pagos'))
        .finally(() => setLoadingFin(false));
    }
    if (tab === 'attendance' && !attLoaded) {
      setLoadingAtt(true);
      api.get('/attendance/stats/club')
        .then((r) => { setAttStats(r.data.data ?? []); setAttLoaded(true); })
        .catch(() => toast.error('Error al cargar asistencia'))
        .finally(() => setLoadingAtt(false));
    }
    if (tab === 'performance' && teams.length === 0) {
      api.get('/teams').then((r) => {
        const ts = r.data.data ?? [];
        setTeams(ts);
        if (ts.length > 0) setPerfTeamId(ts[0].id);
      }).catch(() => {});
    }
  }, [tab]);

  useEffect(() => {
    if (!perfTeamId) return;
    setLoadingPerf(true);
    api.get('/stats/leaderboard', { params: { teamId: perfTeamId } })
      .then((r) => setPerfRows(r.data.data ?? []))
      .catch(() => toast.error('Error al cargar rendimiento'))
      .finally(() => setLoadingPerf(false));
  }, [perfTeamId]);

  const monthlyBuckets = useMemo<MonthBucket[]>(() => {
    const map = new Map<string, MonthBucket>();
    for (const p of payments) {
      const d = new Date(p.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
      if (!map.has(key)) map.set(key, { month: label, billed: 0, collected: 0, pending: 0, overdue: 0, count: 0 });
      const b = map.get(key)!;
      b.count++;
      b.billed += p.amount;
      if (p.status === 'PAID')    b.collected += p.amount;
      if (p.status === 'PENDING') b.pending   += p.amount;
      if (p.status === 'OVERDUE') b.overdue   += p.amount;
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0])).map(([, v]) => v);
  }, [payments]);

  const finTotals = useMemo(() => ({
    billed:    payments.reduce((s, p) => s + p.amount, 0),
    collected: payments.filter((p) => p.status === 'PAID').reduce((s, p) => s + p.amount, 0),
    pending:   payments.filter((p) => p.status === 'PENDING').reduce((s, p) => s + p.amount, 0),
    overdue:   payments.filter((p) => p.status === 'OVERDUE').reduce((s, p) => s + p.amount, 0),
  }), [payments]);

  const handleExport = () => {
    if (tab === 'financial') exportCSV(
      [['Mes', 'Facturado', 'Cobrado', 'Pendiente', 'Vencido', 'Cant. cobros'],
       ...monthlyBuckets.map((b) => [b.month, String(b.billed), String(b.collected), String(b.pending), String(b.overdue), String(b.count)])],
      'reporte-financiero.csv'
    );
    if (tab === 'attendance') exportCSV(
      [['Jugador', 'Equipo', 'Total', 'Presente', 'Tarde', 'Ausente', 'Justificado', '%'],
       ...attStats.map((r) => [
         `${r.player.user.firstName} ${r.player.user.lastName}`,
         r.player.team ? `${r.player.team.name} · ${r.player.team.category}` : '—',
         String(r.total), String(r.present), String(r.late), String(r.absent), String(r.excused),
         r.percentage != null ? `${r.percentage}%` : '—',
       ])],
      'reporte-asistencia.csv'
    );
    if (tab === 'performance') exportCSV(
      [['Jugador', 'PJ', 'PTS', 'REB', 'AST', 'ROB', 'BLQ'],
       ...perfRows.map((r) => [
         `${r.player.user.firstName} ${r.player.user.lastName}`,
         String(r.gamesPlayed), avg(r.averages.points), avg(r.averages.rebounds),
         avg(r.averages.assists), avg(r.averages.steals), avg(r.averages.blocks),
       ])],
      'reporte-rendimiento.csv'
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary">Reportes</h1>
          <p className="text-muted-foreground">Análisis financiero, de asistencia y rendimiento</p>
        </div>
        <button onClick={handleExport}
          className="flex items-center gap-2 border border-border hover:bg-muted text-secondary font-medium py-2 px-4 rounded-lg transition text-sm">
          <Download size={15} /> Exportar CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {([['financial', 'Financiero'], ['attendance', 'Asistencia'], ['performance', 'Rendimiento']] as [Tab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition',
              tab === key ? 'bg-surface text-secondary shadow-sm' : 'text-muted-foreground hover:text-secondary'
            )}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Financial ── */}
      {tab === 'financial' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total facturado', value: finTotals.billed,    color: 'text-secondary' },
              { label: 'Total cobrado',   value: finTotals.collected, color: 'text-success' },
              { label: 'Pendiente',       value: finTotals.pending,   color: 'text-warning' },
              { label: 'Vencido',         value: finTotals.overdue,   color: 'text-danger' },
            ].map((c) => (
              <div key={c.label} className="bg-surface rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
                <p className={cn('text-xl font-bold', c.color)}>{formatCurrency(c.value)}</p>
              </div>
            ))}
          </div>

          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted border-b border-border">
                <tr>
                  {['Mes', 'Facturado', 'Cobrado', 'Pendiente', 'Vencido', 'Cobros'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingFin
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-b border-border">
                        {Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>)}
                      </tr>
                    ))
                  : monthlyBuckets.length === 0
                  ? <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Sin datos financieros</td></tr>
                  : monthlyBuckets.map((b) => (
                      <tr key={b.month} className="border-b border-border hover:bg-muted/40 transition">
                        <td className="px-4 py-3 font-medium text-secondary capitalize">{b.month}</td>
                        <td className="px-4 py-3 text-secondary">{formatCurrency(b.billed)}</td>
                        <td className="px-4 py-3 text-success font-medium">{formatCurrency(b.collected)}</td>
                        <td className="px-4 py-3 text-warning">{formatCurrency(b.pending)}</td>
                        <td className="px-4 py-3 text-danger">{formatCurrency(b.overdue)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{b.count}</td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Attendance ── */}
      {tab === 'attendance' && (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted border-b border-border">
                <tr>
                  {['Jugador', 'Equipo', 'Total', 'Presente', 'Tarde', 'Ausente', 'Justif.', 'Asistencia'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingAtt
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-border">
                        {Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>)}
                      </tr>
                    ))
                  : attStats.length === 0
                  ? <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Sin datos de asistencia</td></tr>
                  : attStats
                      .sort((a, b) => (b.percentage ?? -1) - (a.percentage ?? -1))
                      .map((r) => (
                        <tr key={r.player.id} className="border-b border-border hover:bg-muted/40 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                                {r.player.user.firstName[0]}{r.player.user.lastName[0]}
                              </div>
                              <span className="font-medium text-secondary">{r.player.user.firstName} {r.player.user.lastName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {r.player.team ? `${r.player.team.name} · ${r.player.team.category}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{r.total}</td>
                          <td className="px-4 py-3 text-success font-medium">{r.present}</td>
                          <td className="px-4 py-3 text-warning">{r.late}</td>
                          <td className="px-4 py-3 text-danger">{r.absent}</td>
                          <td className="px-4 py-3 text-accent">{r.excused}</td>
                          <td className="px-4 py-3">
                            {r.percentage != null ? (
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-muted rounded-full h-1.5">
                                  <div
                                    className={cn('h-1.5 rounded-full', r.percentage >= 80 ? 'bg-success' : r.percentage >= 60 ? 'bg-warning' : 'bg-danger')}
                                    style={{ width: `${r.percentage}%` }}
                                  />
                                </div>
                                <span className={cn('text-xs font-semibold', r.percentage >= 80 ? 'text-success' : r.percentage >= 60 ? 'text-warning' : 'text-danger')}>
                                  {r.percentage}%
                                </span>
                              </div>
                            ) : <span className="text-muted-foreground text-xs">—</span>}
                          </td>
                        </tr>
                      ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Performance ── */}
      {tab === 'performance' && (
        <div className="space-y-4">
          <select value={perfTeamId} onChange={(e) => setPerfTeamId(e.target.value)}
            className="appearance-none px-3 py-2 border border-border rounded-lg bg-surface text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary transition">
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.category}</option>)}
          </select>

          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Jugador</th>
                    <th className="text-center px-3 py-3 font-medium text-muted-foreground">PJ</th>
                    {['PTS', 'REB', 'AST', 'ROB', 'BLQ'].map((h) => (
                      <th key={h} className="text-center px-3 py-3 font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingPerf
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i} className="border-b border-border">
                          {Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>)}
                        </tr>
                      ))
                    : perfRows.length === 0
                    ? <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Sin estadísticas para este equipo</td></tr>
                    : perfRows
                        .sort((a, b) => (b.averages.points ?? 0) - (a.averages.points ?? 0))
                        .map((r, idx) => (
                          <tr key={r.player.id} className="border-b border-border hover:bg-muted/40 transition">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-muted-foreground w-4">{idx + 1}</span>
                                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                                  {r.player.user.firstName[0]}{r.player.user.lastName[0]}
                                </div>
                                <div>
                                  <p className="font-medium text-secondary">{r.player.user.firstName} {r.player.user.lastName}</p>
                                  {r.player.position && <p className="text-xs text-muted-foreground">{r.player.position}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center text-muted-foreground">{r.gamesPlayed}</td>
                            {(['points', 'rebounds', 'assists', 'steals', 'blocks'] as const).map((key) => (
                              <td key={key} className={cn('px-3 py-3 text-center font-medium', key === 'points' ? 'text-primary' : 'text-secondary')}>
                                {avg(r.averages[key])}
                              </td>
                            ))}
                          </tr>
                        ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
