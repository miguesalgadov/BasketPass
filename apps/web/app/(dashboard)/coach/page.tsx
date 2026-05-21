'use client';

import { useEffect, useState } from 'react';
import { Calendar, Users, ClipboardList, Trophy, Clock, MapPin } from 'lucide-react';
import { StatsCard } from '@/components/modules/stats/StatsCard';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface UpcomingEvent {
  id: string;
  type: 'match' | 'training';
  date: Date;
  title: string;
  subtitle?: string;
  teamName: string;
  duration?: number;
}

interface Stats {
  totalTeams: number;
  weekTrainings: number;
  monthMatches: number;
  totalPlayers: number;
}

function formatEventDate(d: Date) {
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
    + ' · ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

export default function CoachDashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats]       = useState<Stats | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [teamsRes, matchesRes, trainingsRes, playersRes] = await Promise.all([
          api.get('/teams'),
          api.get('/matches'),
          api.get('/trainings'),
          api.get('/players', { params: { limit: 1 } }),
        ]);

        const now = new Date();
        const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const cutoff = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

        const allTeams: any[]     = teamsRes.data.data ?? [];
        const allMatches: any[]   = matchesRes.data.data ?? [];
        const allTrainings: any[] = trainingsRes.data.data ?? [];

        const weekTrainings = allTrainings.filter(
          (t) => new Date(t.date) >= now && new Date(t.date) <= weekEnd
        ).length;

        const monthMatches = allMatches.filter(
          (m) => new Date(m.date) >= now && new Date(m.date) <= monthEnd && m.status === 'SCHEDULED'
        ).length;

        const events: UpcomingEvent[] = [
          ...allMatches
            .filter((m) => new Date(m.date) >= now && new Date(m.date) <= cutoff && m.status === 'SCHEDULED')
            .map((m): UpcomingEvent => ({
              id: m.id, type: 'match', date: new Date(m.date),
              title: `Partido vs. ${m.opponent}`,
              subtitle: m.location,
              teamName: m.team?.name ?? '',
            })),
          ...allTrainings
            .filter((t) => new Date(t.date) >= now && new Date(t.date) <= cutoff)
            .map((t): UpcomingEvent => ({
              id: t.id, type: 'training', date: new Date(t.date),
              title: 'Entrenamiento',
              subtitle: t.location,
              teamName: t.team?.name ?? '',
              duration: t.duration,
            })),
        ].sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 8);

        setStats({
          totalTeams: allTeams.length,
          weekTrainings,
          monthMatches,
          totalPlayers: playersRes.data.meta?.total ?? 0,
        });
        setUpcoming(events);
      } catch {
        setStats({ totalTeams: 0, weekTrainings: 0, monthMatches: 0, totalPlayers: 0 });
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary">
          Hola, {user?.firstName} 👋
        </h1>
        <p className="text-muted-foreground">Panel del entrenador</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Equipos"
          value={stats?.totalTeams ?? '—'}
          icon={<Trophy size={20} />}
          loading={loading}
          color="primary"
        />
        <StatsCard
          title="Entrenamientos esta semana"
          value={stats?.weekTrainings ?? '—'}
          icon={<Calendar size={20} />}
          loading={loading}
          color="accent"
        />
        <StatsCard
          title="Partidos este mes"
          value={stats?.monthMatches ?? '—'}
          icon={<ClipboardList size={20} />}
          loading={loading}
          color="success"
        />
        <StatsCard
          title="Jugadores en el club"
          value={stats?.totalPlayers ?? '—'}
          icon={<Users size={20} />}
          loading={loading}
          color="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming sessions */}
        <div className="bg-surface rounded-xl border border-border p-6">
          <h2 className="font-semibold text-secondary mb-4">Próximas sesiones</h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}
            </div>
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay sesiones programadas en los próximos 14 días.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((ev) => (
                <div key={ev.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0 bg-muted">
                    {ev.type === 'match' ? '🏀' : '💪'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-secondary truncate">
                      {ev.teamName} — {ev.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock size={10} />
                      <span>{formatEventDate(ev.date)}</span>
                      {ev.duration && <span>· {ev.duration} min</span>}
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

        {/* Quick links */}
        <div className="bg-surface rounded-xl border border-border p-6">
          <h2 className="font-semibold text-secondary mb-4">Acciones rápidas</h2>
          <div className="space-y-2">
            {[
              { href: '/coach/attendance', emoji: '✅', label: 'Registrar asistencia', desc: 'Marcá la asistencia del último entrenamiento' },
              { href: '/coach/calendar',   emoji: '📅', label: 'Ver calendario',       desc: 'Partidos y entrenamientos programados' },
              { href: '/coach/players',    emoji: '👥', label: 'Ver jugadores',        desc: 'Plantel completo del club' },
              { href: '/coach/stats',      emoji: '📊', label: 'Estadísticas',         desc: 'Rendimiento por jugador y partido' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition group"
              >
                <span className="text-xl w-9 text-center">{item.emoji}</span>
                <div>
                  <p className="text-sm font-medium text-secondary group-hover:text-primary transition">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
