'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

interface UpcomingMatch {
  id: string;
  championshipId: string;
  championshipName: string;
  scheduledAt: string | null;
  status: string;
  homeTeam: string;
  awayTeam: string;
  sessionId: string | null;
  sessionStatus: string | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Sin fecha';
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) {
    return `Hoy ${d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    SCHEDULED:   { label: 'Programado',  cls: 'bg-[#38BDF8]/10 text-[#38BDF8]' },
    LIVE:        { label: 'En vivo',     cls: 'bg-emerald-500/10 text-emerald-400 animate-pulse' },
    IN_PROGRESS: { label: 'En curso',    cls: 'bg-emerald-500/10 text-emerald-400' },
    FINISHED:    { label: 'Finalizado',  cls: 'bg-white/10 text-[#7A8098]' },
  };
  const s = map[status] ?? { label: status, cls: 'bg-white/10 text-[#7A8098]' };
  return <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', s.cls)}>{s.label}</span>;
}

interface BasketPassTeam {
  id: string;
  name: string;
  category?: string;
}

function TeamPicker({
  label,
  teams,
  selectedId,
  customName,
  onSelect,
  onCustomChange,
}: {
  label: string;
  teams: BasketPassTeam[];
  selectedId: string;
  customName: string;
  onSelect: (id: string) => void;
  onCustomChange: (name: string) => void;
}) {
  return (
    <div>
      <label className="text-xs text-[#7A8098] mb-1 block">{label}</label>
      <select
        value={selectedId}
        onChange={e => onSelect(e.target.value)}
        className="w-full px-3 py-2.5 rounded-lg bg-[#0F1117] border border-[#2A2F3D] text-white focus:outline-none focus:ring-2 focus:ring-[#F97316] text-sm mb-2"
      >
        <option value="">— Escribir nombre —</option>
        {teams.map(t => (
          <option key={t.id} value={t.id}>{t.name}{t.category ? ` (${t.category})` : ''}</option>
        ))}
      </select>
      {!selectedId && (
        <input
          value={customName}
          onChange={e => onCustomChange(e.target.value)}
          placeholder="Nombre del equipo"
          className="w-full px-3 py-2.5 rounded-lg bg-[#0F1117] border border-[#2A2F3D] text-white placeholder:text-[#7A8098] focus:outline-none focus:ring-2 focus:ring-[#F97316] text-sm"
        />
      )}
    </div>
  );
}

function FriendlyModal({ onClose, onCreated }: { onClose: () => void; onCreated: (sessionId: string) => void }) {
  const [teams, setTeams] = useState<BasketPassTeam[]>([]);
  const [homeId, setHomeId] = useState('');
  const [awayId, setAwayId] = useState('');
  const [homeName, setHomeName] = useState('');
  const [awayName, setAwayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/teams').then(res => {
      const data = res.data.data ?? res.data;
      setTeams(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, []);

  const resolvedHomeName = homeId ? (teams.find(t => t.id === homeId)?.name ?? '') : homeName;
  const resolvedAwayName = awayId ? (teams.find(t => t.id === awayId)?.name ?? '') : awayName;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resolvedHomeName.trim() || !resolvedAwayName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const payload: Record<string, string> = {
        homeTeamName: resolvedHomeName.trim(),
        awayTeamName: resolvedAwayName.trim(),
      };
      if (homeId) payload.homeTeamId = homeId;
      if (awayId) payload.awayTeamId = awayId;
      const res = await api.post('/stats/matches/friendly', payload);
      const session = res.data.data ?? res.data;
      onCreated(session.id);
    } catch (err: any) {
      setError(err.response?.data?.error?.message ?? 'Error al crear el partido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-[#181C25] rounded-2xl border border-white/10 p-6 w-full max-w-sm">
        <h3 className="text-base font-semibold text-white mb-4">Nuevo amistoso</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <TeamPicker
            label="Equipo local"
            teams={teams}
            selectedId={homeId}
            customName={homeName}
            onSelect={setHomeId}
            onCustomChange={setHomeName}
          />
          <TeamPicker
            label="Equipo visitante"
            teams={teams}
            selectedId={awayId}
            customName={awayName}
            onSelect={setAwayId}
            onCustomChange={setAwayName}
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm text-[#7A8098] hover:text-white border border-white/10 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !resolvedHomeName.trim() || !resolvedAwayName.trim()}
              className="flex-1 py-2.5 text-sm font-semibold bg-[#F97316] hover:bg-orange-600 text-white rounded-xl transition disabled:opacity-60"
            >
              {loading ? 'Creando...' : 'Crear e iniciar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StatsHomePage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [matches, setMatches] = useState<UpcomingMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFriendly, setShowFriendly] = useState(false);

  const fetchMatches = useCallback(async () => {
    try {
      const res = await api.get('/stats/matches');
      setMatches(res.data.data ?? res.data);
    } catch {
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  function handleStart(match: UpcomingMatch) {
    if (match.sessionId) {
      router.push(`/stats/${match.sessionId}/live`);
    } else {
      router.push(`/stats/setup?matchId=${match.id}`);
    }
  }

  function handleFriendlyCreated(sessionId: string) {
    setShowFriendly(false);
    router.push(`/stats/${sessionId}/live`);
  }

  const today = matches.filter(m => m.scheduledAt && new Date(m.scheduledAt).toDateString() === new Date().toDateString());
  const upcoming = matches.filter(m => !today.includes(m));

  return (
    <div className="min-h-screen bg-[#0F1117] text-white flex flex-col">
      {showFriendly && (
        <FriendlyModal onClose={() => setShowFriendly(false)} onCreated={handleFriendlyCreated} />
      )}

      {/* Header */}
      <div className="bg-[#181C25] border-b border-white/10 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#F97316] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">B</div>
          <div>
            <div className="text-sm font-semibold text-white">Estadísticas</div>
            <div className="text-xs text-[#7A8098]">{user?.firstName} {user?.lastName}</div>
          </div>
        </div>
        <button onClick={() => { logout(); router.replace('/stats/login'); }}
          className="text-xs text-[#7A8098] hover:text-white transition">
          Salir
        </button>
      </div>

      <div className="flex-1 p-4 max-w-lg mx-auto w-full space-y-5">
        {/* New friendly button */}
        <button
          onClick={() => setShowFriendly(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[#F97316]/40 bg-[#F97316]/10 text-[#F97316] text-sm font-semibold hover:bg-[#F97316]/20 transition"
        >
          + Nuevo amistoso
        </button>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : matches.length === 0 ? (
          <div className="bg-[#181C25] rounded-2xl border border-white/10 p-8 text-center">
            <p className="text-[#7A8098] text-sm">No hay partidos programados esta semana</p>
            <p className="text-xs text-[#7A8098] mt-1">Usá el botón de arriba para crear un amistoso</p>
          </div>
        ) : (
          <>
            {/* Today's matches */}
            {today.length > 0 && (
              <div>
                <div className="text-xs text-[#F97316] font-semibold uppercase tracking-widest mb-2 px-1">Hoy</div>
                <div className="space-y-2">
                  {today.map(m => (
                    <MatchCard key={m.id} match={m} onStart={() => handleStart(m)} />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming */}
            {upcoming.length > 0 && (
              <div>
                <div className="text-xs text-[#7A8098] font-semibold uppercase tracking-widest mb-2 px-1">Próximos</div>
                <div className="space-y-2">
                  {upcoming.map(m => (
                    <MatchCard key={m.id} match={m} onStart={() => handleStart(m)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MatchCard({ match, onStart }: { match: UpcomingMatch; onStart: () => void }) {
  const hasSession = !!match.sessionId;
  const isFinished = match.status === 'FINISHED';
  const isLive = match.status === 'LIVE' || match.status === 'IN_PROGRESS';

  return (
    <div className="bg-[#181C25] rounded-2xl border border-white/10 p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="text-[10px] text-[#7A8098]">{match.championshipName}</div>
          <div className="text-xs text-[#7A8098] mt-0.5">{formatDate(match.scheduledAt)}</div>
        </div>
        {statusBadge(match.status)}
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-sm font-semibold text-white flex-1 text-right">{match.homeTeam}</span>
        <span className="text-xs text-[#7A8098] px-2">vs</span>
        <span className="text-sm font-semibold text-white flex-1">{match.awayTeam}</span>
      </div>

      <button
        onClick={onStart}
        className={cn(
          'w-full py-2 rounded-xl text-sm font-semibold transition',
          isLive || (hasSession && !isFinished)
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
            : isFinished
            ? 'bg-white/5 text-[#7A8098] border border-white/10 hover:bg-white/10'
            : 'bg-[#F97316] text-white hover:bg-orange-600'
        )}
      >
        {isLive ? '⬤ En curso — continuar'
          : hasSession && !isFinished ? 'Continuar estadísticas'
          : isFinished ? 'Ver estadísticas'
          : 'Iniciar estadísticas'}
      </button>
    </div>
  );
}
