'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { BarChart2 } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────────

interface StatLeaderEntry {
  rank: number;
  playerId: string;
  playerName: string;
  teamName: string;
  value: number;
}

interface StatsLeaders {
  points: StatLeaderEntry[];
  rebounds: StatLeaderEntry[];
  assists: StatLeaderEntry[];
  steals: StatLeaderEntry[];
  blocks: StatLeaderEntry[];
  ftPercentage: StatLeaderEntry[];
}

// ── Stat category card ─────────────────────────────────────────────────────────

const CATEGORY_CONFIG: {
  key: keyof StatsLeaders;
  label: string;
  unit?: string;
  isPercent?: boolean;
}[] = [
  { key: 'points', label: 'Puntos por partido' },
  { key: 'rebounds', label: 'Rebotes por partido' },
  { key: 'assists', label: 'Asistencias por partido' },
  { key: 'steals', label: 'Robos por partido' },
  { key: 'blocks', label: 'Bloqueos por partido' },
  { key: 'ftPercentage', label: '% Tiro libre', isPercent: true },
];

function StatCategoryCard({
  label,
  entries,
  isPercent,
}: {
  label: string;
  entries: StatLeaderEntry[];
  isPercent?: boolean;
}) {
  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 bg-muted border-b border-border">
        <h3 className="font-semibold text-secondary text-sm">{label}</h3>
      </div>

      {entries.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          Sin datos
        </p>
      ) : (
        <div className="divide-y divide-border">
          {entries.slice(0, 5).map((entry, i) => (
            <div key={entry.playerId} className="flex items-center gap-3 px-4 py-3">
              {/* Rank */}
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                  i === 0
                    ? 'bg-warning/20 text-warning'
                    : i === 1
                    ? 'bg-muted text-secondary'
                    : i === 2
                    ? 'bg-orange-100 text-orange-600'
                    : 'bg-muted/50 text-muted-foreground'
                )}
              >
                {entry.rank}
              </div>

              {/* Player info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-secondary truncate">
                  {entry.playerName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {entry.teamName}
                </p>
              </div>

              {/* Value */}
              <div
                className={cn(
                  'text-lg font-bold flex-shrink-0',
                  i === 0 ? 'text-primary' : 'text-secondary'
                )}
              >
                {isPercent
                  ? `${(entry.value * 100).toFixed(1)}%`
                  : entry.value.toFixed(1)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

const emptyStats: StatsLeaders = {
  points: [],
  rebounds: [],
  assists: [],
  steals: [],
  blocks: [],
  ftPercentage: [],
};

export default function EstadisticasPage() {
  const params = useParams<{ id: string }>();
  const [stats, setStats] = useState<StatsLeaders>(emptyStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await api.get(
          `/championships/${params.id}/stats/leaders`
        );
        setStats(res.data.data ?? res.data);
      } catch {
        toast.error('Error al cargar estadísticas');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [params.id]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-surface rounded-xl border border-border animate-pulse"
          >
            <div className="h-10 bg-muted border-b border-border" />
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
                <div className="w-6 h-6 rounded-full bg-muted" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-muted rounded w-32" />
                  <div className="h-3 bg-muted rounded w-20" />
                </div>
                <div className="h-5 w-10 bg-muted rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  const hasAnyStats = CATEGORY_CONFIG.some(
    (c) => (stats[c.key] ?? []).length > 0
  );

  if (!hasAnyStats) {
    return (
      <div className="bg-surface rounded-xl border border-border p-12 text-center">
        <BarChart2 className="mx-auto mb-3 text-muted-foreground" size={36} />
        <p className="font-medium text-secondary mb-1">
          Sin estadísticas disponibles
        </p>
        <p className="text-sm text-muted-foreground">
          Las estadísticas se mostrarán una vez que se carguen resultados de
          partidos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {CATEGORY_CONFIG.map((cat) => (
          <StatCategoryCard
            key={cat.key}
            label={cat.label}
            entries={stats[cat.key] ?? []}
            isPercent={cat.isPercent}
          />
        ))}
      </div>
    </div>
  );
}
