'use client';

import { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  TrendingUp, TrendingDown, Minus, Wallet, ChevronLeft, ChevronRight,
  ArrowUpRight, ArrowDownRight, CheckCircle2, Clock, AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function fmtCLP(n: number): string {
  return '$' + Math.abs(n).toLocaleString('es-CL');
}

function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

interface DashboardData {
  currentBalance: number;
  currency:       string;
  monthIncome:    number;
  monthExpense:   number;
  netFlow:        number;
  prevIncome:     number;
  prevExpense:    number;
  chartData: { label: string; income: number; expense: number }[];
  categoryBreakdown: { category: string; label: string; total: number; count: number }[];
  recentTransactions: {
    id: string; type: string; amount: number;
    concept: string; category: string; date: string; evidenceCount: number;
  }[];
}

interface PaymentStats {
  paidThisMonth: number;
  paidCount:     number;
  pendingTotal:  number;
  pendingCount:  number;
  overdueCount:  number;
  paymentRate:   number;
}

interface KPICardProps {
  label:     string;
  value:     string;
  sub?:      string;
  subColor?: string;
  icon:      React.ReactNode;
  accent:    string;
}

function KPICard({ label, value, sub, subColor, icon, accent }: KPICardProps) {
  return (
    <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <p className={cn('text-2xl font-bold', accent)}>{value}</p>
          {sub && <p className={cn('text-xs mt-1', subColor ?? 'text-muted-foreground')}>{sub}</p>}
        </div>
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', accent.replace('text-', 'bg-').replace('-600','') + '/10')}>
          {icon}
        </div>
      </div>
    </div>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  VENUE_RENTAL:     '#F97316',
  EQUIPMENT:        '#8B5CF6',
  TRANSPORT:        '#06B6D4',
  REFEREE:          '#F59E0B',
  TOURNAMENT_ENTRY: '#10B981',
  COACH_FEE:        '#EF4444',
  MEDICAL:          '#3B82F6',
  CLEANING:         '#84CC16',
  ADMIN:            '#6B7280',
  OTHER_EXPENSE:    '#9CA3AF',
};

export default function FinanzasDashboardPage() {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data,         setData]         = useState<DashboardData | null>(null);
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, paymRes] = await Promise.all([
        api.get(`/finanzas/dashboard?year=${year}&month=${month}`),
        api.get(`/finanzas/payment-stats?year=${year}&month=${month}`),
      ]);
      setData(dashRes.data.data);
      setPaymentStats(paymRes.data.data);
    } catch {
      toast.error('Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    const curDate = new Date(year, month - 1);
    if (curDate >= new Date(now.getFullYear(), now.getMonth())) return;
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const incPct  = pctChange(data.monthIncome,  data.prevIncome);
  const expPct  = pctChange(data.monthExpense, data.prevExpense);
  const totalExp = data.categoryBreakdown.reduce((s, c) => s + c.total, 0);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Month selector */}
      <div className="flex items-center gap-3">
        <button onClick={prevMonth} className="p-1.5 rounded-lg border border-border hover:bg-muted/50 text-secondary transition">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-secondary min-w-[120px] text-center">
          {MONTHS[month - 1]} {year}
        </span>
        <button onClick={nextMonth} disabled={new Date(year, month - 1) >= new Date(now.getFullYear(), now.getMonth())}
          className="p-1.5 rounded-lg border border-border hover:bg-muted/50 text-secondary transition disabled:opacity-40">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Saldo actual"
          value={fmtCLP(data.currentBalance)}
          sub={data.currency}
          icon={<Wallet size={18} className="text-primary" />}
          accent="text-primary"
        />
        <KPICard
          label="Ingresos del mes"
          value={fmtCLP(data.monthIncome)}
          sub={incPct !== null ? `${incPct >= 0 ? '+' : ''}${incPct.toFixed(0)}% vs mes ant.` : undefined}
          subColor={incPct !== null ? (incPct >= 0 ? 'text-emerald-600' : 'text-red-500') : undefined}
          icon={<ArrowUpRight size={18} className="text-emerald-600" />}
          accent="text-emerald-600"
        />
        <KPICard
          label="Egresos del mes"
          value={fmtCLP(data.monthExpense)}
          sub={expPct !== null ? `${expPct >= 0 ? '+' : ''}${expPct.toFixed(0)}% vs mes ant.` : undefined}
          subColor={expPct !== null ? (expPct > 0 ? 'text-red-500' : 'text-emerald-600') : undefined}
          icon={<ArrowDownRight size={18} className="text-red-500" />}
          accent="text-red-500"
        />
        <KPICard
          label="Flujo neto"
          value={`${data.netFlow >= 0 ? '+' : ''}${fmtCLP(data.netFlow)}`}
          sub={data.netFlow >= 0 ? 'Superávit' : 'Déficit'}
          subColor={data.netFlow >= 0 ? 'text-emerald-600' : 'text-red-500'}
          icon={data.netFlow >= 0
            ? <TrendingUp size={18} className="text-emerald-600" />
            : <TrendingDown size={18} className="text-red-500" />}
          accent={data.netFlow >= 0 ? 'text-emerald-600' : 'text-red-500'}
        />
      </div>

      {/* Payment KPIs */}
      {paymentStats && (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-secondary flex items-center gap-2">
              <CheckCircle2 size={15} className="text-primary" />
              Cuotas — {MONTHS[month - 1]} {year}
            </h2>
            <Link href="/admin/finanzas/cuotas"
              className="text-xs text-primary font-medium hover:underline">
              Ver matriz completa →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
            <div className="px-5 py-4">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <CheckCircle2 size={11} className="text-emerald-500" /> Recaudado este mes
              </p>
              <p className="text-xl font-bold text-emerald-600">{fmtCLP(paymentStats.paidThisMonth)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{paymentStats.paidCount} cuotas cobradas</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Clock size={11} className="text-amber-500" /> Por recaudar
              </p>
              <p className="text-xl font-bold text-amber-600">{fmtCLP(paymentStats.pendingTotal)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{paymentStats.pendingCount} cuotas hasta {MONTHS[month - 1]}</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <AlertTriangle size={11} className="text-red-500" /> Cuotas vencidas
              </p>
              <p className={cn('text-xl font-bold', paymentStats.overdueCount > 0 ? 'text-red-500' : 'text-secondary')}>
                {paymentStats.overdueCount}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">en el año {year}</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <TrendingUp size={11} className="text-primary" /> Tasa de pago
              </p>
              <p className={cn('text-xl font-bold', paymentStats.paymentRate >= 80 ? 'text-emerald-600' : paymentStats.paymentRate >= 50 ? 'text-amber-600' : 'text-red-500')}>
                {paymentStats.paymentRate}%
              </p>
              <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full transition-all',
                  paymentStats.paymentRate >= 80 ? 'bg-emerald-500' :
                  paymentStats.paymentRate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                )} style={{ width: `${paymentStats.paymentRate}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Bar chart — last 6 months */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-secondary mb-4">Ingresos vs Egresos (últimos 6 meses)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.chartData} barSize={14} barGap={4}>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                formatter={(val: number, name: string) => [fmtCLP(val), name === 'income' ? 'Ingresos' : 'Egresos']}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}
              />
              <Bar dataKey="income"  fill="#22C55E" radius={[3,3,0,0]} />
              <Bar dataKey="expense" fill="#EF4444" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category breakdown */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-secondary mb-4">Egresos por categoría</h2>
          {data.categoryBreakdown.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              Sin egresos este mes
            </div>
          ) : (
            <div className="space-y-3">
              {data.categoryBreakdown.map(c => {
                const pct = totalExp > 0 ? (c.total / totalExp) * 100 : 0;
                const color = CATEGORY_COLORS[c.category] ?? '#9CA3AF';
                return (
                  <div key={c.category}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-secondary font-medium truncate">{c.label}</span>
                      <span className="text-muted-foreground flex-shrink-0 ml-2">{fmtCLP(c.total)}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      {data.recentTransactions.length > 0 && (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-secondary">Últimos movimientos</h2>
          </div>
          <div className="divide-y divide-border">
            {data.recentTransactions.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  t.type === 'INCOME' ? 'bg-emerald-50' : t.type === 'EXPENSE' ? 'bg-red-50' : 'bg-muted',
                )}>
                  {t.type === 'INCOME'
                    ? <ArrowUpRight size={15} className="text-emerald-600" />
                    : t.type === 'EXPENSE'
                    ? <ArrowDownRight size={15} className="text-red-500" />
                    : <Minus size={15} className="text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-secondary truncate">{t.concept}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(t.date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                    {t.evidenceCount > 0 && ` · 📎 ${t.evidenceCount}`}
                  </p>
                </div>
                <span className={cn(
                  'text-sm font-semibold flex-shrink-0',
                  t.type === 'INCOME' ? 'text-emerald-600' : t.type === 'EXPENSE' ? 'text-red-500' : 'text-muted-foreground',
                )}>
                  {t.type === 'INCOME' ? '+' : t.type === 'EXPENSE' ? '-' : ''}{fmtCLP(t.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
