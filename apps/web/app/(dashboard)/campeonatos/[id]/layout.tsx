'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Trophy, BarChart2, CalendarDays, GitBranch,
  ArrowLeft, Play, Loader2, ClipboardEdit, Settings,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { cn, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  ChampionshipContext, Championship, ChampionshipStatus,
} from './championship-context';

const STATUS_CONFIG: Record<ChampionshipStatus, { label: string; className: string }> = {
  DRAFT:         { label: 'Borrador',     className: 'bg-muted text-muted-foreground' },
  REGISTRATION:  { label: 'Inscripción',  className: 'bg-accent/10 text-accent' },
  ACTIVE:        { label: 'Fase regular', className: 'bg-primary/10 text-primary' },
  REGULAR_SEASON:{ label: 'Fase regular', className: 'bg-primary/10 text-primary' },
  PLAYOFFS:      { label: 'Playoffs',     className: 'bg-purple-100 text-purple-700' },
  FINISHED:      { label: 'Finalizado',   className: 'bg-success/10 text-success' },
  CANCELLED:     { label: 'Cancelado',    className: 'bg-danger/10 text-danger' },
};

function StatusBadge({ status }: { status: ChampionshipStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return (
    <span className={cn('inline-block text-xs font-medium px-2.5 py-0.5 rounded-full', cfg.className)}>
      {cfg.label}
    </span>
  );
}

export default function ChampionshipLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();

  const isAdmin = user?.role === 'CLUB_ADMIN' || user?.role === 'SUPER_ADMIN';
  const isCoach = user?.role === 'COACH';
  const canLoadResult = isAdmin || isCoach;

  const [championship, setChampionship] = useState<Championship | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const fetchChampionship = useCallback(async () => {
    try {
      const res = await api.get(`/championships/${id}`);
      setChampionship(res.data.data ?? res.data);
    } catch {
      toast.error('Error al cargar campeonato');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchChampionship(); }, [fetchChampionship]);

  const handleStart = async () => {
    if (!championship) return;
    setStarting(true);
    try {
      await api.post(`/championships/${id}/start`);
      toast.success('Campeonato iniciado — inscripciones abiertas');
      fetchChampionship();
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message ?? 'Error al iniciar campeonato');
    } finally {
      setStarting(false);
    }
  };

  const tabs: { href: string; label: string; icon: React.ReactNode }[] = [
    { href: `/campeonatos/${id}/tabla`,        label: 'Tabla',        icon: <Trophy size={15} /> },
    { href: `/campeonatos/${id}/fixture`,       label: 'Fixture',      icon: <CalendarDays size={15} /> },
  ];
  if (championship?.hasPlayoffs) {
    tabs.push({ href: `/campeonatos/${id}/playoffs`, label: 'Playoffs', icon: <GitBranch size={15} /> });
  }
  tabs.push({ href: `/campeonatos/${id}/estadisticas`, label: 'Estadísticas', icon: <BarChart2 size={15} /> });
  if (isAdmin) {
    tabs.push({ href: `/campeonatos/${id}/configuracion`, label: 'Configuración', icon: <Settings size={15} /> });
  }

  const isActive = championship?.status === 'ACTIVE' || championship?.status === 'REGULAR_SEASON';

  return (
    <ChampionshipContext.Provider value={{ championship, loading, refresh: fetchChampionship }}>
      <div className="space-y-0">
        <div className="mb-4">
          <button
            onClick={() => router.push('/campeonatos')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-secondary transition"
          >
            <ArrowLeft size={15} />
            Campeonatos
          </button>
        </div>

        <div className="bg-surface rounded-xl border border-border p-5 mb-0">
          {loading || !championship ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-muted rounded w-16" />
              <div className="h-6 bg-muted rounded w-64" />
              <div className="h-4 bg-muted rounded w-40" />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={championship.status} />
                  <span className="text-xs text-muted-foreground">{championship.season}</span>
                  {championship.startDate && (
                    <span className="text-xs text-muted-foreground">
                      · Inicio: {formatDate(championship.startDate)}
                    </span>
                  )}
                </div>
                <h1 className="text-xl font-bold text-secondary">{championship.name}</h1>
                <p className="text-sm text-muted-foreground">{championship.category}</p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                {isAdmin && championship.status === 'DRAFT' && (
                  <button
                    onClick={handleStart}
                    disabled={starting}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary hover:bg-primary-600 text-white rounded-lg transition disabled:opacity-60"
                  >
                    {starting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                    Abrir inscripciones
                  </button>
                )}
                {canLoadResult && isActive && (
                  <Link
                    href={`/campeonatos/${id}/fixture`}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-secondary hover:bg-secondary/90 text-white rounded-lg transition"
                  >
                    <ClipboardEdit size={14} />
                    Cargar resultado
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-surface border-x border-b border-border rounded-b-xl mb-6 overflow-x-auto">
          <div className="flex min-w-max">
            {tabs.map((tab) => {
              const active = pathname === tab.href || pathname.startsWith(tab.href + '/');
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap',
                    active
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-secondary hover:border-border'
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        {children}
      </div>
    </ChampionshipContext.Provider>
  );
}
