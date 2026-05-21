'use client';

import { useEffect, useState } from 'react';
import { Users, Trophy, DollarSign, Calendar, ClipboardCheck, AlertCircle, MapPin, Clock, Home, Plane } from 'lucide-react';
import { StatsCard } from '@/components/modules/stats/StatsCard';
import { PaymentStatus } from '@/components/modules/payments/PaymentStatus';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const CURRENT_MONTH = new Date().getMonth() + 1;

interface UpcomingEvent {
  id: string;
  type: 'match' | 'training';
  date: Date;
  title: string;
  subtitle?: string;
  teamName: string;
  isHome?: boolean;
}

interface RecentPayment {
  id: string;
  concept: string;
  amount: number;
  currency: string;
  status: string;
  playerName?: string;
  createdAt: string;
}

interface Stats {
  totalPlayers: number;
  activeTeams: number;
  monthlyRevenue: number;
  pendingPayments: number;
  upcomingMatches: number;
  overduePayments: number;
}

function formatEventDate(d: Date) {
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
    + ' · ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

export default function AdminDashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats]               = useState<Stats | null>(null);
  const [upcoming, setUpcoming]         = useState<UpcomingEvent[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const now = new Date();
        const currentYear  = now.getFullYear();
        const currentMonth = CURRENT_MONTH;

        const [playersRes, teamsRes, feesRes, matchesRes, trainingsRes] = await Promise.all([
          api.get('/players', { params: { limit: 1 } }),
          api.get('/teams'),
          api.get('/fees/matrix', { params: { year: currentYear } }),
          api.get('/matches'),
          api.get('/trainings'),
        ]);

        const matrix = feesRes.data.data;
        const feeTypeName     = matrix?.feeType?.name     ?? 'Cuota';
        const feeTypeCurrency = matrix?.feeType?.currency ?? 'CLP';
        const matrixTotals    = matrix?.totals;
        const byMonth         = matrixTotals?.byMonth ?? {};

        // Revenue collected this month
        const monthlyRevenue = byMonth[currentMonth]?.charged ?? 0;

        // Count PENDING fees only for the current month
        let pendingPayments = 0;
        let overduePayments = matrixTotals?.overdueCount ?? 0;
        const paidFees: RecentPayment[] = [];

        for (const player of (matrix?.players ?? [])) {
          const currentFee = player.fees?.[currentMonth];
          if (currentFee?.status === 'PENDING') pendingPayments++;

          for (let m = 1; m <= 12; m++) {
            const fee = player.fees?.[m];
            if (!fee) continue;
            if (fee.status === 'PAID' && fee.paidAt) {
              paidFees.push({
                id:         fee.id,
                concept:    `${feeTypeName} ${MONTHS[m - 1]}`,
                amount:     fee.paidAmount ?? fee.amount,
                currency:   feeTypeCurrency,
                status:     'PAID',
                playerName: `${player.firstName} ${player.lastName}`,
                createdAt:  fee.paidAt,
              });
            }
          }
        }

        paidFees.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const allMatches: any[]   = matchesRes.data.data ?? [];
        const allTrainings: any[] = trainingsRes.data.data ?? [];
        const upcomingMatches = allMatches.filter((m) => new Date(m.date) >= now && m.status === 'SCHEDULED').length;

        const cutoff = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
        const events: UpcomingEvent[] = [
          ...allMatches
            .filter((m) => new Date(m.date) >= now && new Date(m.date) <= cutoff && m.status === 'SCHEDULED')
            .map((m): UpcomingEvent => ({
              id: m.id, type: 'match', date: new Date(m.date),
              title: `vs. ${m.opponent}`,
              subtitle: m.location,
              teamName: m.team?.name ?? '',
              isHome: m.isHome,
            })),
          ...allTrainings
            .filter((t) => new Date(t.date) >= now && new Date(t.date) <= cutoff)
            .map((t): UpcomingEvent => ({
              id: t.id, type: 'training', date: new Date(t.date),
              title: 'Entrenamiento',
              subtitle: t.location,
              teamName: t.team?.name ?? '',
            })),
        ].sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 6);

        setStats({
          totalPlayers: playersRes.data.meta?.total ?? 0,
          activeTeams: (teamsRes.data.data ?? []).length,
          monthlyRevenue,
          pendingPayments,
          upcomingMatches,
          overduePayments,
        });
        setUpcoming(events);
        setRecentPayments(paidFees.slice(0, 6));
      } catch {
        setStats({ totalPlayers: 0, activeTeams: 0, monthlyRevenue: 0, pendingPayments: 0, upcomingMatches: 0, overduePayments: 0 });
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary">Hola, {user?.firstName} 👋</h1>
        <p className="text-muted-foreground">Resumen del club</p>
      </div>

      {/* Overdue alert */}
      {!loading && (stats?.overduePayments ?? 0) > 0 && (
        <div className="flex items-center gap-3 bg-danger/5 border border-danger/20 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="text-danger flex-shrink-0" />
          <p className="text-sm text-danger font-medium">
            Hay {stats!.overduePayments} pago{stats!.overduePayments > 1 ? 's' : ''} vencido{stats!.overduePayments > 1 ? 's' : ''} sin cobrar.
          </p>
          <a href="/admin/finanzas/cuotas" className="ml-auto text-xs font-semibold text-danger underline underline-offset-2">
            Ver cuotas →
          </a>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          title="Jugadores activos"
          value={stats?.totalPlayers ?? '—'}
          icon={<Users size={20} />}
          loading={loading}
          color="primary"
        />
        <StatsCard
          title="Equipos activos"
          value={stats?.activeTeams ?? '—'}
          icon={<Trophy size={20} />}
          loading={loading}
          color="accent"
        />
        <StatsCard
          title="Ingresos del mes"
          value={stats ? formatCurrency(stats.monthlyRevenue) : '—'}
          icon={<DollarSign size={20} />}
          loading={loading}
          color="success"
        />
        <StatsCard
          title="Próximos partidos"
          value={stats?.upcomingMatches ?? '—'}
          icon={<Calendar size={20} />}
          loading={loading}
          color="accent"
        />
        <StatsCard
          title={`Pendientes ${MONTHS[CURRENT_MONTH - 1]}`}
          value={stats?.pendingPayments ?? '—'}
          icon={<ClipboardCheck size={20} />}
          loading={loading}
          color="warning"
        />
        <StatsCard
          title="Pagos vencidos"
          value={stats?.overduePayments ?? '—'}
          icon={<AlertCircle size={20} />}
          loading={loading}
          color="danger"
        />
      </div>

      {/* Two-column panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming events */}
        <div className="bg-surface rounded-xl border border-border p-6">
          <h2 className="font-semibold text-secondary mb-4">Próximos eventos</h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}
            </div>
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay eventos en los próximos 21 días.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((ev) => (
                <div key={ev.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0 bg-muted">
                    {ev.type === 'match' ? '🏀' : '💪'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-secondary truncate">{ev.teamName} {ev.title}</p>
                      {ev.type === 'match' && (
                        ev.isHome
                          ? <Home size={11} className="text-success flex-shrink-0" />
                          : <Plane size={11} className="text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock size={10} />
                      <span>{formatEventDate(ev.date)}</span>
                      {ev.subtitle && (
                        <>
                          <MapPin size={10} />
                          <span className="truncate">{ev.subtitle}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent payments */}
        <div className="bg-surface rounded-xl border border-border p-6">
          <h2 className="font-semibold text-secondary mb-4">Últimos pagos</h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}
            </div>
          ) : recentPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay pagos registrados.</p>
          ) : (
            <div className="space-y-1">
              {recentPayments.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-secondary truncate">{p.concept}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.playerName ?? 'General'} · {formatDate(p.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-semibold text-secondary">
                      {formatCurrency(p.amount, p.currency)}
                    </span>
                    <PaymentStatus status={p.status as any} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
