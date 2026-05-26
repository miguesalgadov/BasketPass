'use client';

import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, ChevronDown, Save } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
type SessionType = 'training' | 'match';

interface Session {
  id: string;
  type: SessionType;
  date: string;
  label: string;
  teamId: string;
  teamName: string;
}

interface Player {
  id: string;
  jerseyNumber?: number;
  user: { firstName: string; lastName: string };
}

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; icon: React.ReactNode; activeClass: string }[] = [
  { value: 'PRESENT', label: 'Presente', icon: <CheckCircle size={15} />, activeClass: 'bg-success/10 text-success ring-1 ring-success/40' },
  { value: 'ABSENT',  label: 'Ausente',  icon: <XCircle size={15} />,    activeClass: 'bg-danger/10 text-danger ring-1 ring-danger/40' },
  { value: 'LATE',    label: 'Tarde',    icon: <Clock size={15} />,       activeClass: 'bg-warning/10 text-warning ring-1 ring-warning/40' },
  { value: 'EXCUSED', label: 'Justif.',  icon: <AlertCircle size={15} />, activeClass: 'bg-accent/10 text-accent ring-1 ring-accent/40' },
];

const STATUS_COLOR: Record<AttendanceStatus, string> = {
  PRESENT: 'text-success',
  ABSENT:  'text-danger',
  LATE:    'text-warning',
  EXCUSED: 'text-accent',
};

function formatSessionDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

export default function AttendancePage() {
  const [sessions, setSessions]   = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [players, setPlayers]     = useState<Player[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [notes, setNotes]         = useState<Record<string, string>>({});
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingPlayers, setLoadingPlayers]   = useState(false);
  const [saving, setSaving]       = useState(false);

  // Load sessions: last 14 + next 7 days
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const [mRes, tRes] = await Promise.all([
          api.get('/matches'),
          api.get('/trainings'),
        ]);
        const matches: Session[] = (mRes.data.data ?? []).map((m: any) => ({
          id: m.id,
          type: 'match' as SessionType,
          date: m.date,
          label: `🏀 Partido vs. ${m.opponent}`,
          teamId: m.teamId,
          teamName: m.team?.name ?? '',
        }));
        const trainings: Session[] = (tRes.data.data ?? []).map((t: any) => ({
          id: t.id,
          type: 'training' as SessionType,
          date: t.date,
          label: `💪 Entrenamiento`,
          teamId: t.teamId,
          teamName: t.team?.name ?? '',
        }));
        const now = new Date();
        const upcoming = [...matches, ...trainings]
          .filter((s) => new Date(s.date) >= now)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // soonest first
        const past = [...matches, ...trainings]
          .filter((s) => new Date(s.date) < now)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // most recent first
        const all = [...upcoming, ...past];
        setSessions(all);
        if (all.length > 0) setSessionId(all[0].id);
      } catch {
        toast.error('Error al cargar sesiones');
      } finally {
        setLoadingSessions(false);
      }
    };
    fetchSessions();
  }, []);

  // Load players + existing attendance when session changes
  const loadSession = useCallback(async (sid: string) => {
    const session = sessions.find((s) => s.id === sid);
    if (!session) return;
    setLoadingPlayers(true);
    try {
      const [pRes, aRes] = await Promise.all([
        api.get('/players', { params: { teamId: session.teamId, limit: 100 } }),
        api.get(`/attendance/session/${sid}`, { params: { type: session.type } }),
      ]);

      const playerList: Player[] = pRes.data.data ?? [];
      setPlayers(playerList);

      // Seed attendance: use existing records, default PRESENT
      const existingMap: Record<string, AttendanceStatus> = {};
      const existingNotes: Record<string, string> = {};
      for (const rec of (aRes.data.data ?? [])) {
        existingMap[rec.playerId] = rec.status;
        if (rec.notes) existingNotes[rec.playerId] = rec.notes;
      }
      const initialStatus: Record<string, AttendanceStatus> = {};
      for (const p of playerList) {
        initialStatus[p.id] = existingMap[p.id] ?? 'PRESENT';
      }
      setAttendance(initialStatus);
      setNotes(existingNotes);
    } catch {
      toast.error('Error al cargar la sesión');
    } finally {
      setLoadingPlayers(false);
    }
  }, [sessions]);

  useEffect(() => {
    if (sessionId && sessions.length > 0) loadSession(sessionId);
  }, [sessionId, sessions, loadSession]);

  const setStatus = (playerId: string, status: AttendanceStatus) =>
    setAttendance((prev) => ({ ...prev, [playerId]: status }));

  const handleSave = async () => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;
    setSaving(true);
    try {
      await api.post('/attendance', {
        sessionId,
        sessionType: session.type,
        attendances: players.map((p) => ({
          playerId: p.id,
          status: attendance[p.id] ?? 'PRESENT',
          notes: notes[p.id] || undefined,
        })),
      });
      toast.success('Asistencia guardada');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const summary = Object.values(attendance).reduce(
    (acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; },
    {} as Record<string, number>
  );

  const selectedSession = sessions.find((s) => s.id === sessionId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary">Asistencia</h1>
          <p className="text-muted-foreground">Registrá la asistencia de cada jugador</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loadingPlayers || players.length === 0}
          className="flex items-center gap-2 bg-primary hover:bg-primary-600 text-white font-semibold py-2 px-5 rounded-lg transition text-sm disabled:opacity-60"
        >
          {saving ? <><Clock size={14} className="animate-spin" /> Guardando...</> : <><Save size={14} /> Guardar</>}
        </button>
      </div>

      {/* Session selector */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <label className="block text-sm font-medium text-secondary mb-2">Sesión</label>
        {loadingSessions ? (
          <div className="h-10 bg-muted rounded-lg animate-pulse w-full" />
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay partidos ni entrenamientos registrados.</p>
        ) : (
          <div className="relative">
            <select
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="w-full appearance-none px-3 py-2 pr-8 border border-border rounded-lg bg-surface text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary transition"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} — {s.teamName} — {formatSessionDate(s.date)}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        )}
      </div>

      {/* Summary counters */}
      {players.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {STATUS_OPTIONS.map((s) => (
            <div key={s.value} className="bg-surface rounded-xl border border-border p-4 text-center">
              <p className={cn('text-2xl font-bold', STATUS_COLOR[s.value])}>{summary[s.value] || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Player list */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {loadingPlayers ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : players.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            {sessionId ? 'No hay jugadores en este equipo' : 'Seleccioná una sesión para comenzar'}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {players.map((player, idx) => (
              <div key={player.id} className={cn('flex items-center justify-between px-4 py-3', idx % 2 === 0 ? '' : 'bg-muted/20')}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                    {player.user.firstName[0]}{player.user.lastName[0]}
                  </div>
                  <div>
                    <p className="font-medium text-secondary text-sm">
                      {player.user.firstName} {player.user.lastName}
                    </p>
                    {player.jerseyNumber != null && (
                      <p className="text-xs text-muted-foreground">#{player.jerseyNumber}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  {STATUS_OPTIONS.map((opt) => {
                    const isActive = attendance[player.id] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setStatus(player.id, opt.value)}
                        title={opt.label}
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition',
                          isActive ? opt.activeClass : 'text-muted-foreground hover:bg-muted'
                        )}
                      >
                        {opt.icon}
                        <span className="hidden sm:inline">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
