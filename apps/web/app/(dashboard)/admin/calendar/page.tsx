'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Plus, MapPin, Clock, Pencil, Trash2, Home, Plane,
  Repeat, ChevronLeft, ChevronRight, CalendarDays,
} from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { MatchModal, type Match } from '@/components/modules/calendar/MatchModal';
import { TrainingModal, type Training } from '@/components/modules/calendar/TrainingModal';
import { CalendarSyncDialog } from '@/components/modules/calendar/CalendarSyncDialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type TabFilter = 'all' | 'match' | 'training';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// ── helpers ───────────────────────────────────────────────────────────────────
function toLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

// Returns the Monday of the week containing `date`
function weekStart(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Build a 6-row × 7-col grid (Mon–Sun) for a given year/month
function buildGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const start    = weekStart(firstDay);
  const grid: (Date | null)[][] = [];
  const cursor = new Date(start);
  for (let row = 0; row < 6; row++) {
    const week: (Date | null)[] = [];
    for (let col = 0; col < 7; col++) {
      week.push(cursor.getMonth() === month ? new Date(cursor) : null);
      cursor.setDate(cursor.getDate() + 1);
    }
    // Skip empty trailing rows
    if (row > 3 && week.every((d) => d === null)) break;
    grid.push(week);
  }
  return grid;
}

// ── types ─────────────────────────────────────────────────────────────────────
type AnyEvent = { type: 'match'; data: Match } | { type: 'training'; data: Training };

interface BirthdayPlayer { id: string; firstName: string; lastName: string; }

// ── component ─────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const today = new Date();
  const [year, setYear]         = useState(today.getFullYear());
  const [month, setMonth]       = useState(today.getMonth());
  const [tab, setTab]           = useState<TabFilter>('all');

  const [matches, setMatches]     = useState<Match[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [players, setPlayers]     = useState<BirthdayPlayer[]>([]);
  const [loading, setLoading]     = useState(true);

  const [matchModalOpen, setMatchModalOpen]       = useState(false);
  const [editingMatch, setEditingMatch]           = useState<Match | null>(null);
  const [trainingModalOpen, setTrainingModalOpen] = useState(false);
  const [editingTraining, setEditingTraining]     = useState<Training | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<AnyEvent | null>(null);
  const [deleteMode, setDeleteMode]     = useState<'single' | 'forward' | 'all' | null>(null);
  const [deleting, setDeleting]         = useState(false);

  const [detail, setDetail]     = useState<AnyEvent | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);

  // collect teams for the sync dialog filter
  const teams = useMemo(() => {
    const map = new Map<string, { id: string; name: string; category: string }>();
    [...matches, ...trainings].forEach((e) => {
      if (e.team) map.set(e.team.id, e.team);
    });
    return Array.from(map.values());
  }, [matches, trainings]);

  const fetchAll = useCallback(async () => {
    try {
      const [mRes, tRes] = await Promise.all([api.get('/matches'), api.get('/trainings')]);
      setMatches(mRes.data.data ?? []);
      setTrainings(tRes.data.data ?? []);
    } catch {
      toast.error('Error al cargar el calendario');
    } finally {
      setLoading(false);
    }
    // Birthdays: non-blocking, loads independently
    try {
      const pRes = await api.get('/players', { params: { limit: 100 } });
      // Response format: { success, data: [...players], meta: {...} }
      const rawPlayers: any[] = pRes.data.data ?? [];
      setPlayers(
        rawPlayers
          .filter((p) => p.birthDate)
          .map((p) => ({ id: p.id, firstName: p.user.firstName, lastName: p.user.lastName, birthDate: p.birthDate })),
      );
    } catch (err) { console.error('[calendar] birthdays failed:', err); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Group events by local date key
  const eventsByDay = useMemo(() => {
    const map = new Map<string, AnyEvent[]>();
    const addEvent = (ev: AnyEvent, dateStr: string) => {
      if (!map.has(dateStr)) map.set(dateStr, []);
      map.get(dateStr)!.push(ev);
    };
    if (tab !== 'training') {
      matches.forEach((m) => addEvent({ type: 'match', data: m }, toLocalDateKey(new Date(m.date))));
    }
    if (tab !== 'match') {
      trainings.forEach((t) => addEvent({ type: 'training', data: t }, toLocalDateKey(new Date(t.date))));
    }
    return map;
  }, [matches, trainings, tab]);

  // Group birthdays by "MM-DD" — parse ISO string directly to avoid timezone shifts
  const birthdaysByDay = useMemo(() => {
    const map = new Map<string, BirthdayPlayer[]>();
    for (const p of players) {
      const bd: string = (p as any).birthDate ?? '';
      if (!bd) continue;
      // "YYYY-MM-DDTHH:..." → take first 10 chars → "YYYY-MM-DD"
      const parts = bd.slice(0, 10).split('-');
      if (parts.length < 3) continue;
      const key = `${parts[1]}-${parts[2]}`; // "MM-DD"
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return map;
  }, [players]);

  const grid = useMemo(() => buildGrid(year, month), [year, month]);

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const monthLabel = new Date(year, month, 1)
    .toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    .replace(/^\w/, (c) => c.toUpperCase());

  const handleDelete = async (mode: 'single' | 'forward' | 'all') => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === 'match') {
        await api.delete(`/matches/${deleteTarget.data.id}`);
        toast.success('Partido eliminado');
      } else {
        const t = deleteTarget.data as Training;
        if (mode === 'single' || !t.recurrenceGroupId) {
          await api.delete(`/trainings/${t.id}`);
          toast.success('Entrenamiento eliminado');
        } else if (mode === 'forward') {
          await api.delete(`/trainings/series/${t.recurrenceGroupId}`, { params: { fromDate: t.date } });
          toast.success('Entrenamiento y siguientes eliminados');
        } else {
          await api.delete(`/trainings/series/${t.recurrenceGroupId}`);
          toast.success('Serie completa eliminada');
        }
      }
      setDeleteTarget(null);
      setDeleteMode(null);
      setDetail(null);
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Error al eliminar');
    } finally { setDeleting(false); }
  };

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'all',      label: 'Todos' },
    { key: 'match',    label: 'Partidos' },
    { key: 'training', label: 'Entrenamientos' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary">Calendario</h1>
          <p className="text-muted-foreground text-sm">Partidos y entrenamientos del club</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSyncOpen(true)}
            className="flex items-center gap-2 border border-border hover:bg-muted text-secondary font-medium py-2 px-3 rounded-lg transition text-sm"
          >
            <CalendarDays size={15} /> Google Calendar
          </button>
          <button
            onClick={() => { setEditingTraining(null); setTrainingModalOpen(true); }}
            className="flex items-center gap-2 border border-border hover:bg-muted text-secondary font-semibold py-2 px-3 rounded-lg transition text-sm"
          >
            <Plus size={15} /> Entrenamiento
          </button>
          <button
            onClick={() => { setEditingMatch(null); setMatchModalOpen(true); }}
            className="flex items-center gap-2 bg-primary hover:bg-primary-600 text-white font-semibold py-2 px-3 rounded-lg transition text-sm"
          >
            <Plus size={15} /> Partido
          </button>
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between">
        {/* Month nav */}
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-secondary">
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-base font-semibold text-secondary w-44 text-center capitalize">{monthLabel}</h2>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-secondary">
            <ChevronRight size={18} />
          </button>
          <button
            onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}
            className="ml-1 px-3 py-1 text-xs font-medium border border-border rounded-lg hover:bg-muted transition text-secondary"
          >
            Hoy
          </button>
        </div>

        {/* Type filter */}
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn('px-3 py-1 rounded-md text-xs font-medium transition',
                tab === t.key ? 'bg-surface text-secondary shadow-sm' : 'text-muted-foreground hover:text-secondary'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div className="h-96 flex items-center justify-center text-muted-foreground text-sm">
            <Loader2 size={20} className="animate-spin mr-2" /> Cargando...
          </div>
        ) : (
          <div>
            {grid.map((week, wi) => (
              <div key={wi} className={cn('grid grid-cols-7', wi < grid.length - 1 && 'border-b border-border')}>
                {week.map((day, di) => {
                  const key      = day ? toLocalDateKey(day) : '';
                  const evs      = day ? (eventsByDay.get(key) ?? []) : [];
                  const isToday  = day ? toLocalDateKey(day) === toLocalDateKey(today) : false;
                  const bdayKey  = day
                    ? `${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
                    : '';
                  const birthdays = day ? (birthdaysByDay.get(bdayKey) ?? []) : [];
                  const MAX_VISIBLE = 3;

                  return (
                    <div
                      key={di}
                      className={cn(
                        'min-h-[110px] p-1.5 border-r border-border last:border-r-0 align-top',
                        !day && 'bg-muted/20',
                        day && 'hover:bg-muted/10 transition'
                      )}
                    >
                      {day && (
                        <>
                          {/* Day number */}
                          <div className={cn(
                            'w-7 h-7 flex items-center justify-center rounded-full text-xs font-semibold mb-1',
                            isToday ? 'bg-primary text-white' : 'text-secondary'
                          )}>
                            {day.getDate()}
                          </div>

                          {/* Events */}
                          <div className="space-y-0.5">
                            {evs.slice(0, MAX_VISIBLE).map((ev, idx) => (
                              <EventPill key={idx} event={ev} onClick={() => setDetail(ev)} />
                            ))}
                            {evs.length > MAX_VISIBLE && (
                              <button
                                onClick={() => setDetail(evs[MAX_VISIBLE])}
                                className="text-xs text-muted-foreground hover:text-primary w-full text-left px-1"
                              >
                                +{evs.length - MAX_VISIBLE} más
                              </button>
                            )}

                            {/* Birthdays */}
                            {birthdays.map((p) => (
                              <div
                                key={p.id}
                                title={`Cumpleaños: ${p.firstName} ${p.lastName}`}
                                className="w-full text-left px-1.5 py-0.5 rounded text-xs font-medium truncate flex items-center gap-1 bg-pink-100 text-pink-600"
                              >
                                <span className="shrink-0">🎂</span>
                                <span className="truncate">{p.firstName} {p.lastName}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">🏀 Partido</span>
        <span className="flex items-center gap-1.5">💪 Entrenamiento</span>
        <span className="flex items-center gap-1.5"><Repeat size={11} /> Serie recurrente</span>
        <span className="flex items-center gap-1.5">🎂 Cumpleaños</span>
      </div>

      {/* ── Event detail dialog ─────────────────────────────────────────── */}
      <Dialog open={Boolean(detail)} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent>
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {detail.type === 'match' ? '🏀 Partido' : '💪 Entrenamiento'}
                </DialogTitle>
                <DialogDescription>
                  {new Date(detail.type === 'match'
                    ? (detail.data as Match).date
                    : (detail.data as Training).date
                  ).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  {' · '}
                  {formatTime(new Date(detail.type === 'match'
                    ? (detail.data as Match).date
                    : (detail.data as Training).date
                  ))}
                </DialogDescription>
              </DialogHeader>

              <div className="px-6 py-2 space-y-2 text-sm text-secondary">
                {detail.type === 'match' ? (
                  <MatchDetail match={detail.data as Match} />
                ) : (
                  <TrainingDetail training={detail.data as Training} />
                )}
              </div>

              <DialogFooter className="px-6 pb-4 gap-2">
                <button
                  onClick={() => {
                    if (detail.type === 'match') { setEditingMatch(detail.data as Match); setMatchModalOpen(true); }
                    else { setEditingTraining(detail.data as Training); setTrainingModalOpen(true); }
                    setDetail(null);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition"
                >
                  <Pencil size={13} /> Editar
                </button>
                <button
                  onClick={() => { setDeleteTarget(detail); setDetail(null); }}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-danger hover:bg-danger/90 text-white rounded-lg transition"
                >
                  <Trash2 size={13} /> Eliminar
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ──────────────────────────────────────────────── */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(v) => { if (!v) { setDeleteTarget(null); setDeleteMode(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar {deleteTarget?.type === 'match' ? 'partido' : 'entrenamiento'}</DialogTitle>
            <DialogDescription>Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>

          {deleteTarget?.type === 'training' && (deleteTarget.data as Training).recurrenceGroupId ? (
            <div className="px-6 pb-2 space-y-2">
              {([
                { mode: 'single',  label: 'Solo este entrenamiento',          desc: 'Los demás de la serie no se verán afectados.' },
                { mode: 'forward', label: 'Este y los siguientes de la serie', desc: 'Se eliminan desde esta fecha en adelante.' },
                { mode: 'all',     label: 'Toda la serie',                    desc: 'Se eliminan todos los entrenamientos de la serie.' },
              ] as const).map((opt) => (
                <button key={opt.mode} type="button" onClick={() => setDeleteMode(opt.mode)}
                  className={cn('w-full text-left px-4 py-3 rounded-lg border transition',
                    deleteMode === opt.mode
                      ? 'border-danger bg-danger/5 text-danger'
                      : 'border-border hover:border-danger/40 text-secondary hover:bg-muted/40'
                  )}>
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          ) : (
            <p className="px-6 pb-2 text-sm text-muted-foreground">¿Confirmás que querés eliminarlo?</p>
          )}

          <DialogFooter className="px-6 pb-4">
            <button onClick={() => { setDeleteTarget(null); setDeleteMode(null); }}
              className="px-4 py-2 text-sm font-medium text-secondary border border-border rounded-lg hover:bg-muted transition">
              Cancelar
            </button>
            <button
              onClick={() => handleDelete(deleteMode ?? 'single')}
              disabled={deleting || (deleteTarget?.type === 'training' && !!(deleteTarget.data as Training).recurrenceGroupId && !deleteMode)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-danger hover:bg-danger/90 text-white rounded-lg transition disabled:opacity-50"
            >
              {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              Confirmar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modals */}
      <MatchModal
        open={matchModalOpen}
        onClose={() => { setMatchModalOpen(false); setEditingMatch(null); }}
        onSuccess={fetchAll}
        match={editingMatch}
      />
      <TrainingModal
        open={trainingModalOpen}
        onClose={() => { setTrainingModalOpen(false); setEditingTraining(null); }}
        onSuccess={fetchAll}
        training={editingTraining}
      />
      <CalendarSyncDialog open={syncOpen} onClose={() => setSyncOpen(false)} teams={teams} />
    </div>
  );
}

// ── Event pill (inside cell) ──────────────────────────────────────────────────
function EventPill({ event, onClick }: { event: AnyEvent; onClick: () => void }) {
  const isMatch = event.type === 'match';
  const date    = new Date(isMatch ? (event.data as Match).date : (event.data as Training).date);
  const time    = formatTime(date);

  const label = isMatch
    ? `${(event.data as Match).team?.name ?? ''} vs ${(event.data as Match).opponent}`
    : `${(event.data as Training).team?.name ?? ''} — ${(event.data as Training).duration}min`;

  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        'w-full text-left px-1.5 py-0.5 rounded text-xs font-medium truncate flex items-center gap-1 transition hover:opacity-80',
        isMatch ? 'bg-primary/15 text-primary' : 'bg-accent/15 text-accent'
      )}
    >
      <span className="shrink-0 leading-none">{isMatch ? '🏀' : '💪'}</span>
      {(event.data as Training).recurrenceGroupId && <Repeat size={9} className="shrink-0" />}
      <span className="shrink-0 font-normal opacity-75">{time}</span>
      <span className="truncate">{isMatch ? `vs ${(event.data as Match).opponent}` : (event.data as Training).team?.name ?? ''}</span>
    </button>
  );
}

// ── Detail views ──────────────────────────────────────────────────────────────
function MatchDetail({ match }: { match: Match }) {
  return (
    <div className="space-y-1.5">
      <p className="font-semibold text-base">{match.team?.name ?? '—'} vs. {match.opponent}</p>
      {match.location && <p className="flex items-center gap-1.5 text-muted-foreground"><MapPin size={13} />{match.location}</p>}
      <p className="flex items-center gap-1.5 text-muted-foreground">
        {match.isHome ? <><Home size={13} /> Local</> : <><Plane size={13} /> Visitante</>}
      </p>
      {match.status === 'COMPLETED' && match.scoreHome != null && (
        <p className="font-bold text-primary text-lg">{match.scoreHome} – {match.scoreAway}</p>
      )}
    </div>
  );
}

function TrainingDetail({ training }: { training: Training }) {
  return (
    <div className="space-y-1.5">
      <p className="font-semibold text-base">{training.team?.name ?? '—'} <span className="font-normal text-muted-foreground">({training.team?.category})</span></p>
      <p className="flex items-center gap-1.5 text-muted-foreground"><Clock size={13} /> {training.duration} minutos</p>
      {training.location && <p className="flex items-center gap-1.5 text-muted-foreground"><MapPin size={13} />{training.location}</p>}
      {training.recurrenceGroupId && <p className="flex items-center gap-1.5 text-accent text-xs"><Repeat size={11} /> Entrenamiento recurrente</p>}
      {training.plan && <p className="text-muted-foreground text-xs mt-1 border-t border-border pt-2">{training.plan}</p>}
    </div>
  );
}
