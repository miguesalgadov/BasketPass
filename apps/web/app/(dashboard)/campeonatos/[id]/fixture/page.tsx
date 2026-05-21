'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ClipboardEdit,
  Play,
  Loader2,
  Pencil,
  BarChart2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useChampionship } from '../championship-context';
import { cn, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Participant {
  id: string;
  name: string;
}

type MatchStatus =
  | 'SCHEDULED'
  | 'LIVE'
  | 'FINISHED'
  | 'POSTPONED'
  | 'CANCELLED'
  | 'WALKOVER';

interface MatchTeam {
  id: string;
  name: string;
}

interface Match {
  id: string;
  homeTeam: MatchTeam;
  awayTeam: MatchTeam;
  homeScore?: number;
  awayScore?: number;
  status: MatchStatus;
  scheduledAt?: string;
  venue?: string;
}

interface Round {
  id: string;
  name: string;
  number: number;
  phase?: string;
  startDate?: string;
  matches: Match[];
}

// ── Status badge ───────────────────────────────────────────────────────────────

const MATCH_STATUS: Record<MatchStatus, { label: string; className: string }> =
  {
    SCHEDULED: {
      label: 'Programado',
      className: 'bg-muted text-muted-foreground',
    },
    LIVE: { label: 'En vivo', className: 'bg-success/10 text-success' },
    FINISHED: { label: 'Finalizado', className: 'bg-accent/10 text-accent' },
    POSTPONED: {
      label: 'Postergado',
      className: 'bg-warning/10 text-warning',
    },
    CANCELLED: { label: 'Cancelado', className: 'bg-danger/10 text-danger' },
    WALKOVER: {
      label: 'Walkover',
      className: 'bg-purple-100 text-purple-700',
    },
  };

function MatchStatusBadge({ status }: { status: MatchStatus }) {
  const cfg = MATCH_STATUS[status] ?? MATCH_STATUS.SCHEDULED;
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

// ── Generate fixture dialog ────────────────────────────────────────────────────

function GenerateFixtureDialog({
  open,
  onClose,
  onGenerate,
}: {
  open: boolean;
  onClose: () => void;
  onGenerate: (startDate: string, daysBetweenRounds: number) => Promise<void>;
}) {
  const [startDate, setStartDate] = useState('');
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate) {
      toast.error('Ingresá una fecha de inicio');
      return;
    }
    setLoading(true);
    try {
      await onGenerate(startDate, days);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generar fixture</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="px-6 pb-2 space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Fecha de inicio
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Días entre fechas
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
            />
          </div>
        </form>
        <DialogFooter>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-secondary border border-border rounded-lg hover:bg-muted transition"
          >
            Cancelar
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              if (!startDate) { toast.error('Ingresá una fecha de inicio'); return; }
              setLoading(true);
              onGenerate(startDate, days).finally(() => setLoading(false));
            }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary hover:bg-primary-600 text-white rounded-lg transition disabled:opacity-60"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Generar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit match schedule dialog ─────────────────────────────────────────────────

function EditMatchDialog({
  match,
  participants,
  onClose,
  onSave,
}: {
  match: Match | null;
  participants: Participant[];
  onClose: () => void;
  onSave: (matchId: string, scheduledAt: string, venue: string, homeTeamId: string, awayTeamId: string) => Promise<void>;
}) {
  const [scheduledAt, setScheduledAt] = useState('');
  const [venue, setVenue] = useState('');
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (match) {
      setScheduledAt(match.scheduledAt ? match.scheduledAt.slice(0, 16) : '');
      setVenue(match.venue ?? '');
      setHomeTeamId(match.homeTeam.id);
      setAwayTeamId(match.awayTeam.id);
    }
  }, [match]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!match) return;
    if (homeTeamId === awayTeamId) {
      toast.error('Local y visitante deben ser diferentes');
      return;
    }
    setLoading(true);
    try {
      await onSave(match.id, scheduledAt, venue, homeTeamId, awayTeamId);
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'w-full px-3 py-2 rounded-lg border border-border bg-surface text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition';

  return (
    <Dialog open={!!match} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar partido</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="px-6 pb-2 space-y-4">
          {participants.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Local</label>
                <select value={homeTeamId} onChange={e => setHomeTeamId(e.target.value)} className={inputClass}>
                  {participants.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Visitante</label>
                <select value={awayTeamId} onChange={e => setAwayTeamId(e.target.value)} className={inputClass}>
                  {participants.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Fecha y hora</label>
            <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Sede</label>
            <input type="text" value={venue} onChange={e => setVenue(e.target.value)} placeholder="Opcional" className={inputClass} />
          </div>
        </form>
        <DialogFooter>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-secondary border border-border rounded-lg hover:bg-muted transition">Cancelar</button>
          <button onClick={handleSubmit as any} disabled={loading} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary hover:bg-primary-600 text-white rounded-lg transition disabled:opacity-60">
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            Guardar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function FixturePage() {
  const params = useParams<{ id: string }>();
  const { championship } = useChampionship();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'CLUB_ADMIN' || user?.role === 'SUPER_ADMIN';
  const isCoach = user?.role === 'COACH';
  const canLoadResult = isAdmin || isCoach;

  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedRounds, setCollapsedRounds] = useState<Set<string>>(new Set());
  const [generateOpen, setGenerateOpen] = useState(false);
  const [editMatch, setEditMatch] = useState<Match | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    api.get(`/championships/${params.id}`).then(res => {
      const champ = res.data.data ?? res.data;
      setParticipants(
        (champ.participants ?? []).map((p: any) => ({
          id: p.id,
          name: p.team?.name ?? p.externalName ?? '?',
        }))
      );
    }).catch(() => {});
  }, [params.id]);

  const fetchRounds = useCallback(async () => {
    try {
      const res = await api.get(`/championships/${params.id}/rounds`);
      setRounds(res.data.data ?? res.data);
    } catch {
      toast.error('Error al cargar el fixture');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchRounds();
  }, [fetchRounds]);

  function toggleRound(roundId: string) {
    setCollapsedRounds((prev) => {
      const next = new Set(prev);
      if (next.has(roundId)) next.delete(roundId);
      else next.add(roundId);
      return next;
    });
  }

  async function handleSaveSchedule(matchId: string, scheduledAt: string, venue: string, homeTeamId: string, awayTeamId: string) {
    try {
      await api.patch(`/championships/${params.id}/matches/${matchId}/schedule`, {
        scheduledAt:  scheduledAt  || undefined,
        venue:        venue        || undefined,
        homeTeamId:   homeTeamId   || undefined,
        awayTeamId:   awayTeamId   || undefined,
      });
      toast.success('Partido actualizado');
      setEditMatch(null);
      fetchRounds();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Error al actualizar el partido');
      throw err;
    }
  }

  async function handleGenerate(startDate: string, daysBetweenRounds: number) {
    try {
      await api.post(`/championships/${params.id}/generate-fixture`, {
        startDate,
        daysBetweenRounds,
      });
      toast.success('Fixture generado');
      setGenerateOpen(false);
      fetchRounds();
    } catch (err: any) {
      toast.error(
        err.response?.data?.error?.message ?? 'Error al generar fixture'
      );
      throw err;
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-surface rounded-xl border border-border p-4 animate-pulse"
          >
            <div className="h-5 bg-muted rounded w-32 mb-3" />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="h-10 bg-muted rounded mb-2" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header actions */}
      {isAdmin &&
        rounds.length === 0 &&
        championship?.status === 'REGISTRATION' && (
          <div className="bg-surface rounded-xl border border-border p-8 text-center">
            <CalendarDays
              className="mx-auto mb-3 text-muted-foreground"
              size={36}
            />
            <p className="font-medium text-secondary mb-1">
              Fixture no generado
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Primero agregá equipos y luego generá el fixture
            </p>
            <button
              onClick={() => setGenerateOpen(true)}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
            >
              <Play size={15} />
              Generar fixture
            </button>
          </div>
        )}

      {rounds.length === 0 &&
        !(isAdmin && championship?.status === 'REGISTRATION') && (
          <div className="bg-surface rounded-xl border border-border p-10 text-center">
            <CalendarDays
              className="mx-auto mb-3 text-muted-foreground"
              size={32}
            />
            <p className="text-muted-foreground">
              No hay fixture disponible aún
            </p>
          </div>
        )}

      {/* Rounds */}
      {rounds.map((round) => {
        const collapsed = collapsedRounds.has(round.id);
        return (
          <div
            key={round.id}
            className="bg-surface rounded-xl border border-border overflow-hidden"
          >
            {/* Round header */}
            <button
              onClick={() => toggleRound(round.id)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/40 transition"
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold text-secondary">
                  {round.name}
                </span>
                {round.startDate && (
                  <span className="text-xs text-muted-foreground">
                    {formatDate(round.startDate)}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  · {round.matches.length} partido
                  {round.matches.length !== 1 ? 's' : ''}
                </span>
              </div>
              {collapsed ? (
                <ChevronDown size={16} className="text-muted-foreground" />
              ) : (
                <ChevronUp size={16} className="text-muted-foreground" />
              )}
            </button>

            {/* Matches */}
            {!collapsed && (
              <div className="divide-y divide-border border-t border-border">
                {round.matches.map((match) => {
                  const hasScore =
                    match.homeScore !== undefined &&
                    match.awayScore !== undefined;
                  const isScheduled = match.status === 'SCHEDULED';

                  return (
                    <div
                      key={match.id}
                      className="px-5 py-3 flex flex-col gap-1"
                    >
                      {match.venue && (
                        <span className="text-xs text-muted-foreground">{match.venue}</span>
                      )}
                      <div className="flex items-center gap-4">
                      {/* Teams + score */}
                      <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-3 min-w-0">
                        {/* Home */}
                        <div className="text-right truncate">
                          <span className="text-sm font-medium text-secondary truncate">
                            {match.homeTeam.name}
                          </span>
                        </div>

                        {/* Score or vs */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {hasScore ? (
                            <>
                              <span
                                className={cn(
                                  'text-lg font-bold w-8 text-center',
                                  match.homeScore! > match.awayScore!
                                    ? 'text-success'
                                    : 'text-secondary'
                                )}
                              >
                                {match.homeScore}
                              </span>
                              <span className="text-muted-foreground font-medium">
                                -
                              </span>
                              <span
                                className={cn(
                                  'text-lg font-bold w-8 text-center',
                                  match.awayScore! > match.homeScore!
                                    ? 'text-success'
                                    : 'text-secondary'
                                )}
                              >
                                {match.awayScore}
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground text-sm font-medium px-2">
                              vs
                            </span>
                          )}
                        </div>

                        {/* Away */}
                        <div className="truncate">
                          <span className="text-sm font-medium text-secondary truncate">
                            {match.awayTeam.name}
                          </span>
                        </div>
                      </div>

                      {/* Status + action */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <MatchStatusBadge status={match.status} />
                        {isScheduled && canLoadResult && (
                          <Link
                            href={`/campeonatos/${params.id}/cargar-resultado/${match.id}`}
                            className="flex items-center gap-1 text-xs text-primary hover:text-primary-600 font-medium transition"
                          >
                            <ClipboardEdit size={13} />
                            Cargar
                          </Link>
                        )}
                        {match.status === 'FINISHED' && canLoadResult && (
                          <Link
                            href={`/campeonatos/${params.id}/cargar-resultado/${match.id}`}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-secondary font-medium transition"
                          >
                            <ClipboardEdit size={13} />
                            Editar
                          </Link>
                        )}
                        {(match.status === 'FINISHED' || match.status === 'LIVE') && isAdmin && (
                          <Link
                            href={`/stats/setup?matchId=${match.id}`}
                            className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-400 font-medium transition"
                          >
                            <BarChart2 size={13} />
                            Stats
                          </Link>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => setEditMatch(match)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-secondary font-medium transition"
                          >
                            <Pencil size={13} /> Editar
                          </button>
                        )}
                      </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <GenerateFixtureDialog
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onGenerate={handleGenerate}
      />

      <EditMatchDialog
        match={editMatch}
        participants={participants}
        onClose={() => setEditMatch(null)}
        onSave={handleSaveSchedule}
      />
    </div>
  );
}
