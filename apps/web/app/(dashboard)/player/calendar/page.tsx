'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  MapPin, Clock, Home, Plane, Repeat,
  ChevronLeft, ChevronRight, CalendarDays, Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { CalendarSyncDialog } from '@/components/modules/calendar/CalendarSyncDialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { Match } from '@/components/modules/calendar/MatchModal';
import type { Training } from '@/components/modules/calendar/TrainingModal';

type TabFilter = 'all' | 'match' | 'training';
type AnyEvent = { type: 'match'; data: Match } | { type: 'training'; data: Training };
interface BirthdayPlayer { id: string; firstName: string; lastName: string; }

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function toLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function formatTime(d: Date) {
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}
function weekStart(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function buildGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  const start    = weekStart(firstDay);
  const grid: (Date | null)[][] = [];
  const cursor = new Date(start);
  for (let row = 0; row < 6; row++) {
    const week: (Date | null)[] = [];
    for (let col = 0; col < 7; col++) {
      week.push(cursor.getMonth() === month ? new Date(cursor) : null);
      cursor.setDate(cursor.getDate() + 1);
    }
    if (row > 3 && week.every((d) => d === null)) break;
    grid.push(week);
  }
  return grid;
}

export default function PlayerCalendarPage() {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [tab, setTab]     = useState<TabFilter>('all');

  const [matches, setMatches]     = useState<Match[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [players, setPlayers]     = useState<BirthdayPlayer[]>([]);
  const [loading, setLoading]     = useState(true);
  const [detail, setDetail]       = useState<AnyEvent | null>(null);
  const [syncOpen, setSyncOpen]   = useState(false);

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
    try {
      const pRes = await api.get('/players', { params: { limit: 100 } });
      const rawPlayers: any[] = pRes.data.data ?? [];
      setPlayers(
        rawPlayers
          .filter((p) => p.birthDate)
          .map((p) => ({ id: p.id, firstName: p.user.firstName, lastName: p.user.lastName, birthDate: p.birthDate })),
      );
    } catch { /* cumpleaños opcionales */ }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, AnyEvent[]>();
    const add = (ev: AnyEvent, key: string) => {
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    };
    if (tab !== 'training') matches.forEach((m) => add({ type: 'match', data: m }, toLocalDateKey(new Date(m.date))));
    if (tab !== 'match')    trainings.forEach((t) => add({ type: 'training', data: t }, toLocalDateKey(new Date(t.date))));
    return map;
  }, [matches, trainings, tab]);

  const birthdaysByDay = useMemo(() => {
    const map = new Map<string, BirthdayPlayer[]>();
    for (const p of players) {
      const bd: string = (p as any).birthDate ?? '';
      if (!bd) continue;
      const parts = bd.slice(0, 10).split('-');
      if (parts.length < 3) continue;
      const key = `${parts[1]}-${parts[2]}`;
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
          <h1 className="text-2xl font-bold text-secondary">Mi calendario</h1>
          <p className="text-muted-foreground text-sm">Partidos y entrenamientos de tu equipo</p>
        </div>
        <button
          onClick={() => setSyncOpen(true)}
          className="flex items-center gap-2 border border-border hover:bg-muted text-secondary font-medium py-2 px-3 rounded-lg transition text-sm"
        >
          <CalendarDays size={15} /> Google Calendar
        </button>
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between">
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
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

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
                          <div className={cn(
                            'w-7 h-7 flex items-center justify-center rounded-full text-xs font-semibold mb-1',
                            isToday ? 'bg-primary text-white' : 'text-secondary'
                          )}>
                            {day.getDate()}
                          </div>
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
                            {birthdays.map((p) => (
                              <div
                                key={p.id}
                                title={`Cumpleaños: ${p.firstName} ${p.lastName}`}
                                className="w-full px-1.5 py-0.5 rounded text-xs font-medium truncate flex items-center gap-1 bg-pink-100 text-pink-600"
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

      {/* Event detail — read-only (no edit/delete) */}
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
              <div className="px-6 py-2 pb-4 space-y-2 text-sm text-secondary">
                {detail.type === 'match' ? (
                  <MatchDetail match={detail.data as Match} />
                ) : (
                  <TrainingDetail training={detail.data as Training} />
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <CalendarSyncDialog open={syncOpen} onClose={() => setSyncOpen(false)} teams={teams} />
    </div>
  );
}

function EventPill({ event, onClick }: { event: AnyEvent; onClick: () => void }) {
  const isMatch = event.type === 'match';
  const date    = new Date(isMatch ? (event.data as Match).date : (event.data as Training).date);
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-1.5 py-0.5 rounded text-xs font-medium truncate flex items-center gap-1 transition hover:opacity-80',
        isMatch ? 'bg-primary/15 text-primary' : 'bg-accent/15 text-accent'
      )}
    >
      <span className="shrink-0 leading-none">{isMatch ? '🏀' : '💪'}</span>
      {(event.data as Training).recurrenceGroupId && <Repeat size={9} className="shrink-0" />}
      <span className="shrink-0 font-normal opacity-75">{formatTime(date)}</span>
      <span className="truncate">
        {isMatch ? `vs ${(event.data as Match).opponent}` : ((event.data as Training).team?.name ?? '')}
      </span>
    </button>
  );
}

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
      <p className="font-semibold text-base">
        {training.team?.name ?? '—'}{' '}
        <span className="font-normal text-muted-foreground">({training.team?.category})</span>
      </p>
      <p className="flex items-center gap-1.5 text-muted-foreground"><Clock size={13} /> {training.duration} minutos</p>
      {training.location && <p className="flex items-center gap-1.5 text-muted-foreground"><MapPin size={13} />{training.location}</p>}
      {training.recurrenceGroupId && <p className="flex items-center gap-1.5 text-accent text-xs"><Repeat size={11} /> Entrenamiento recurrente</p>}
      {training.plan && <p className="text-muted-foreground text-xs mt-1 border-t border-border pt-2">{training.plan}</p>}
    </div>
  );
}
