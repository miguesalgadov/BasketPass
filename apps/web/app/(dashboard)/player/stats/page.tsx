'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface Averages {
  points?: number | null;
  rebounds?: number | null;
  assists?: number | null;
  steals?: number | null;
  blocks?: number | null;
  minutes?: number | null;
}

interface GameLog {
  id: string;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
  minutes: number;
  match: { opponent: string; date: string; status: string };
}

import { api } from '@/lib/api';
import toast from 'react-hot-toast';

function StatAvgCard({ label, value, color }: { label: string; value?: number | null; color?: string }) {
  return (
    <div className="bg-surface rounded-xl border border-border p-4 text-center">
      <p className={cn('text-2xl font-bold', color ?? 'text-secondary')}>
        {value != null ? value.toFixed(1) : '—'}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

export default function PlayerStatsPage() {
  const [averages,         setAverages]         = useState<Averages | null>(null);
  const [gamesPlayed,      setGamesPlayed]      = useState(0);
  const [freeThrowsMade,   setFreeThrowsMade]   = useState(0);
  const [freeThrowsAtt,    setFreeThrowsAtt]    = useState(0);
  const [freeThrowPct,     setFreeThrowPct]     = useState<number | null>(null);
  const [gameLog,          setGameLog]          = useState<GameLog[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // First get this user's player record
        const meRes = await api.get('/players/me');
        const player = meRes.data.data;
        if (!player) { setLoading(false); return; }

        const statsRes = await api.get(`/stats/player/${player.id}`);
        const { averages: avgs, stats } = statsRes.data.data;
        setAverages(avgs.averages ?? avgs);
        setGamesPlayed(avgs.gamesPlayed ?? 0);
        setFreeThrowsMade(avgs.freeThrowsMade ?? 0);
        setFreeThrowsAtt(avgs.freeThrowsAttempted ?? 0);
        setFreeThrowPct(avgs.freeThrowPct ?? null);
        setGameLog(stats ?? []);
      } catch {
        toast.error('Error al cargar estadísticas');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary">Mis estadísticas</h1>
        <p className="text-muted-foreground">Rendimiento acumulado por partido</p>
      </div>

      {/* Averages */}
      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-xl border border-border p-4 animate-pulse">
              <div className="h-8 bg-muted rounded mb-2" />
              <div className="h-3 bg-muted rounded w-12 mx-auto" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-semibold text-secondary text-lg">{gamesPlayed}</span>
            <span>partido{gamesPlayed !== 1 ? 's' : ''} jugado{gamesPlayed !== 1 ? 's' : ''}</span>
            {gamesPlayed > 0 && <span className="ml-1 text-xs">(promedios por partido)</span>}
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <StatAvgCard label="Puntos"       value={averages?.points}   color="text-primary" />
            <StatAvgCard label="Rebotes"      value={averages?.rebounds} />
            <StatAvgCard label="Asistencias"  value={averages?.assists} />
            <StatAvgCard label="Robos"        value={averages?.steals} />
            <StatAvgCard label="Bloqueos"     value={averages?.blocks} />
            <StatAvgCard label="Minutos"      value={averages?.minutes} />
            <div className="bg-surface rounded-xl border border-border p-4 text-center">
              <p className={cn('text-2xl font-bold', freeThrowPct != null ? 'text-secondary' : 'text-muted-foreground')}>
                {freeThrowPct != null ? `${freeThrowPct}%` : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">% TL</p>
              {freeThrowsAtt > 0 && (
                <p className="text-[10px] text-muted-foreground mt-0.5">{freeThrowsMade}/{freeThrowsAtt}</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Game log */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-secondary">Historial de partidos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Partido</th>
                {['PTS', 'REB', 'AST', 'ROB', 'BLQ', 'PÉR', 'FAL', 'TLC', 'TLA', '%TL', 'MIN'].map((h) => (
                  <th key={h} className="text-center px-3 py-3 font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 12 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : gameLog.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-muted-foreground">
                    Todavía no tenés estadísticas registradas.
                  </td>
                </tr>
              ) : (
                gameLog.map((g) => {
                  const ftPct = g.freeThrowsAttempted > 0
                    ? Math.round((g.freeThrowsMade / g.freeThrowsAttempted) * 100)
                    : null;
                  return (
                  <tr key={g.id} className="border-b border-border hover:bg-muted/40 transition">
                    <td className="px-4 py-3">
                      <p className="font-medium text-secondary">vs. {g.match.opponent}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(g.match.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </td>
                    {[g.points, g.rebounds, g.assists, g.steals, g.blocks, g.turnovers, g.fouls, g.freeThrowsMade, g.freeThrowsAttempted].map((v, i) => (
                      <td key={i} className={cn('px-3 py-3 text-center', i === 0 ? 'font-bold text-primary' : 'text-secondary')}>
                        {v}
                      </td>
                    ))}
                    <td className="px-3 py-3 text-center text-secondary">
                      {ftPct != null ? `${ftPct}%` : '—'}
                    </td>
                    <td className="px-3 py-3 text-center text-secondary">{g.minutes}</td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
