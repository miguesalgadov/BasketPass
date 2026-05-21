'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trophy, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

type ChampionshipStatus =
  | 'DRAFT'
  | 'REGISTRATION'
  | 'ACTIVE'
  | 'REGULAR_SEASON'
  | 'PLAYOFFS'
  | 'FINISHED'
  | 'CANCELLED';

type ChampionshipFormat =
  | 'SINGLE_ROUND_ROBIN'
  | 'DOUBLE_ROUND_ROBIN'
  | 'GROUPS_THEN_PLAYOFFS'
  | 'CUP';

interface Championship {
  id: string;
  name: string;
  category: string;
  season: string;
  format: ChampionshipFormat;
  status: ChampionshipStatus;
  hasPlayoffs: boolean;
  playoffTeams?: number;
  startDate?: string;
}

const STATUS_CONFIG: Record<
  ChampionshipStatus,
  { label: string; className: string }
> = {
  DRAFT: { label: 'Borrador', className: 'bg-muted text-muted-foreground' },
  REGISTRATION: { label: 'Inscripción', className: 'bg-accent/10 text-accent' },
  ACTIVE: { label: 'Fase regular', className: 'bg-primary/10 text-primary' },
  REGULAR_SEASON: { label: 'Fase regular', className: 'bg-primary/10 text-primary' },
  PLAYOFFS: { label: 'Playoffs', className: 'bg-purple-100 text-purple-700' },
  FINISHED: { label: 'Finalizado', className: 'bg-success/10 text-success' },
  CANCELLED: { label: 'Cancelado', className: 'bg-danger/10 text-danger' },
};

const FORMAT_LABELS: Record<ChampionshipFormat, string> = {
  SINGLE_ROUND_ROBIN: 'Solo ida',
  DOUBLE_ROUND_ROBIN: 'Ida y vuelta',
  GROUPS_THEN_PLAYOFFS: 'Grupos + Playoffs',
  CUP: 'Copa',
};

function StatusBadge({ status }: { status: ChampionshipStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return (
    <span
      className={cn(
        'inline-block text-xs font-medium px-2 py-0.5 rounded-full',
        cfg.className
      )}
    >
      {cfg.label}
    </span>
  );
}

export default function CampeonatosPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'CLUB_ADMIN' || user?.role === 'SUPER_ADMIN';

  const [championships, setChampionships] = useState<Championship[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChampionships = useCallback(async () => {
    try {
      const res = await api.get('/championships');
      setChampionships(res.data.data ?? res.data);
    } catch {
      toast.error('Error al cargar campeonatos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChampionships();
  }, [fetchChampionships]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary">Campeonatos</h1>
          <p className="text-muted-foreground">
            Gestión de torneos y ligas del club
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => router.push('/campeonatos/nuevo')}
            className="flex items-center gap-2 bg-primary hover:bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
          >
            <Plus size={16} />
            Nuevo campeonato
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface rounded-xl border border-border p-5 animate-pulse"
            >
              <div className="h-4 bg-muted rounded w-16 mb-3" />
              <div className="h-5 bg-muted rounded w-48 mb-2" />
              <div className="h-4 bg-muted rounded w-32 mb-4" />
              <div className="h-4 bg-muted rounded w-24" />
            </div>
          ))}
        </div>
      ) : championships.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <Trophy className="mx-auto mb-3 text-muted-foreground" size={32} />
          <p className="text-secondary font-medium mb-1">
            No hay campeonatos registrados
          </p>
          <p className="text-muted-foreground text-sm mb-4">
            Creá el primer campeonato del club
          </p>
          {isAdmin && (
            <button
              onClick={() => router.push('/campeonatos/nuevo')}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
            >
              <Plus size={16} />
              Nuevo campeonato
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {championships.map((c) => (
            <button
              key={c.id}
              onClick={() => router.push(`/campeonatos/${c.id}/tabla`)}
              className="bg-surface rounded-xl border border-border p-5 hover:shadow-md transition-shadow text-left group w-full"
            >
              <div className="flex items-start justify-between mb-2">
                <StatusBadge status={c.status} />
                <span className="text-xs text-muted-foreground">{c.season}</span>
              </div>
              <h3 className="font-semibold text-secondary text-base mb-1 group-hover:text-primary transition-colors">
                {c.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-3">{c.category}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border pt-3">
                <Trophy size={12} />
                <span>{FORMAT_LABELS[c.format]}</span>
                {c.hasPlayoffs && (
                  <span className="ml-auto bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded text-xs font-medium">
                    Playoffs
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
