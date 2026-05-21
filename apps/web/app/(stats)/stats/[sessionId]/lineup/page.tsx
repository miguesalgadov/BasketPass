'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface SessionTeam {
  participantId: string;
  teamName: string;
}

interface Session {
  id: string;
  status: string;
  home: SessionTeam;
  away: SessionTeam;
}

interface LineupEntry {
  id: string;
  participantId: string;
  playerId?: string;
  name: string;
  number?: number;
  position?: string;
  isStarter: boolean;
  isOnCourt: boolean;
}

interface RosterPlayer {
  playerId: string;
  name: string;
  number?: number;
  position?: string;
}

function NavTabs({ sessionId, active }: { sessionId: string; active: string }) {
  const tabs = [
    { key: 'live',      label: '⬤ Live',       href: `/stats/${sessionId}/live` },
    { key: 'lineup',    label: 'Alineación',   href: `/stats/${sessionId}/lineup` },
    { key: 'boxscore',  label: 'Box Score',    href: `/stats/${sessionId}/boxscore` },
    { key: 'analysis',  label: 'Análisis IA',  href: `/stats/${sessionId}/analysis` },
    { key: 'shotchart', label: 'Shot Chart',   href: `/stats/${sessionId}/shotchart` },
  ];
  return (
    <div className="flex gap-1 px-4 py-2 bg-[#181C25] border-b border-white/10 overflow-x-auto">
      {tabs.map(t => (
        <Link
          key={t.key}
          href={t.href}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition',
            active === t.key
              ? 'bg-[#F97316] text-white'
              : 'text-[#7A8098] hover:text-white hover:bg-white/10'
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

// ── Import roster modal ────────────────────────────────────────────────────────

function ImportModal({
  sessionId,
  participantId,
  teamName,
  roster,
  existingIds,
  onClose,
  onImported,
}: {
  sessionId: string;
  participantId: string;
  teamName: string;
  roster: RosterPlayer[];
  existingIds: Set<string>;
  onClose: () => void;
  onImported: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const available = roster.filter(p => !existingIds.has(p.playerId));

  function toggleAll() {
    if (selected.size === available.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(available.map(p => p.playerId)));
    }
  }

  async function handleImport() {
    if (selected.size === 0) return;
    setLoading(true);
    try {
      const players = roster
        .filter(p => selected.has(p.playerId))
        .map(p => ({
          participantId,
          playerId: p.playerId,
          jerseyNumber: p.number,
          position: p.position,
          isStarter: false,
        }));
      await api.post(`/stats/sessions/${sessionId}/lineup/bulk`, { players });
      toast.success(`${selected.size} jugador(es) importado(s)`);
      onImported();
    } catch {
      toast.error('Error al importar jugadores');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-[#181C25] rounded-2xl border border-white/10 p-5 w-full max-w-sm flex flex-col max-h-[80vh]">
        <h3 className="text-sm font-semibold text-white mb-1">Importar jugadores</h3>
        <p className="text-xs text-[#7A8098] mb-3">{teamName}</p>

        {available.length === 0 ? (
          <p className="text-xs text-[#7A8098] py-4 text-center">
            {roster.length === 0
              ? 'Este equipo no tiene jugadores en BasketPass.'
              : 'Todos los jugadores ya están en la alineación.'}
          </p>
        ) : (
          <>
            <button
              onClick={toggleAll}
              className="text-xs text-[#F97316] text-left mb-2 hover:underline"
            >
              {selected.size === available.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
            </button>
            <div className="flex-1 overflow-y-auto space-y-1.5 mb-4">
              {available.map(p => (
                <label
                  key={p.playerId}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition',
                    selected.has(p.playerId)
                      ? 'bg-[#F97316]/10 border-[#F97316]/30'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(p.playerId)}
                    onChange={() => {
                      const next = new Set(selected);
                      next.has(p.playerId) ? next.delete(p.playerId) : next.add(p.playerId);
                      setSelected(next);
                    }}
                    className="accent-[#F97316]"
                  />
                  <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold text-white/70 flex-shrink-0">
                    {p.number ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{p.name}</div>
                    <div className="text-[10px] text-[#7A8098]">{p.position ?? 'Sin posición'}</div>
                  </div>
                </label>
              ))}
            </div>
          </>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm text-[#7A8098] hover:text-white border border-white/10 rounded-xl transition"
          >
            Cancelar
          </button>
          {available.length > 0 && (
            <button
              onClick={handleImport}
              disabled={loading || selected.size === 0}
              className="flex-1 py-2.5 text-sm font-semibold bg-[#F97316] hover:bg-orange-600 text-white rounded-xl transition disabled:opacity-60"
            >
              {loading ? 'Importando...' : `Importar (${selected.size})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add external player modal ─────────────────────────────────────────────────

function AddPlayerModal({
  sessionId,
  participantId,
  onClose,
  onAdded,
}: {
  sessionId: string;
  participantId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [position, setPosition] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await api.post(`/stats/sessions/${sessionId}/lineup`, {
        participantId,
        externalPlayerName: name.trim(),
        externalPlayerNumber: number ? parseInt(number) : undefined,
        position: position || undefined,
        isStarter: false,
      });
      toast.success('Jugador agregado');
      onAdded();
    } catch {
      toast.error('Error al agregar jugador');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-[#181C25] rounded-2xl border border-white/10 p-5 w-full max-w-sm">
        <h3 className="text-sm font-semibold text-white mb-4">Agregar jugador</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-[#7A8098] mb-1 block">Nombre *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nombre del jugador"
              required
              className="w-full px-3 py-2.5 rounded-lg bg-[#0F1117] border border-[#2A2F3D] text-white placeholder:text-[#7A8098] focus:outline-none focus:ring-2 focus:ring-[#F97316] text-sm"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-[#7A8098] mb-1 block">Número</label>
              <input
                value={number}
                onChange={e => setNumber(e.target.value)}
                placeholder="00"
                type="number"
                min="0"
                max="99"
                className="w-full px-3 py-2.5 rounded-lg bg-[#0F1117] border border-[#2A2F3D] text-white placeholder:text-[#7A8098] focus:outline-none focus:ring-2 focus:ring-[#F97316] text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-[#7A8098] mb-1 block">Posición</label>
              <select
                value={position}
                onChange={e => setPosition(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-[#0F1117] border border-[#2A2F3D] text-white focus:outline-none focus:ring-2 focus:ring-[#F97316] text-sm"
              >
                <option value="">—</option>
                <option value="PG">PG</option>
                <option value="SG">SG</option>
                <option value="SF">SF</option>
                <option value="PF">PF</option>
                <option value="C">C</option>
              </select>
            </div>
          </div>
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
              disabled={loading || !name.trim()}
              className="flex-1 py-2.5 text-sm font-semibold bg-[#F97316] hover:bg-orange-600 text-white rounded-xl transition disabled:opacity-60"
            >
              {loading ? 'Agregando...' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LineupPage() {
  const params = useParams<{ sessionId: string }>();
  const { user } = useAuthStore();
  const role = user?.role as string | undefined;
  const isAdmin = role === 'CLUB_ADMIN' || role === 'SUPER_ADMIN' || role === 'COACH' || role === 'STATISTICIAN';

  const [session, setSession] = useState<Session | null>(null);
  const [homeLineup, setHomeLineup] = useState<LineupEntry[]>([]);
  const [awayLineup, setAwayLineup] = useState<LineupEntry[]>([]);
  const [homeRoster, setHomeRoster] = useState<RosterPlayer[]>([]);
  const [awayRoster, setAwayRoster] = useState<RosterPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  type ModalState =
    | null
    | { type: 'import'; side: 'home' | 'away' }
    | { type: 'addPlayer'; participantId: string };
  const [modal, setModal] = useState<ModalState>(null);

  const fetchData = useCallback(async () => {
    try {
      const [sessionRes, lineupRes] = await Promise.all([
        api.get(`/stats/sessions/${params.sessionId}`),
        api.get(`/stats/sessions/${params.sessionId}/lineup`),
      ]);

      const sess: Session = sessionRes.data.data ?? sessionRes.data;
      setSession(sess);

      const lineups: LineupEntry[] = lineupRes.data.data ?? lineupRes.data;
      setHomeLineup(lineups.filter((l: LineupEntry) => l.participantId === sess.home.participantId));
      setAwayLineup(lineups.filter((l: LineupEntry) => l.participantId === sess.away.participantId));

      // Fetch roster (only fails if no BasketPass teams linked — silently ignore)
      api.get(`/stats/sessions/${params.sessionId}/roster`).then(r => {
        const roster = r.data.data ?? r.data;
        setHomeRoster(roster.home ?? []);
        setAwayRoster(roster.away ?? []);
      }).catch(() => {});
    } catch {
      toast.error('Error al cargar la alineación');
    } finally {
      setLoading(false);
    }
  }, [params.sessionId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function toggleStarter(lineupId: string, isStarter: boolean) {
    try {
      await api.patch(`/stats/sessions/${params.sessionId}/lineup/${lineupId}`, { isStarter: !isStarter });
      fetchData();
    } catch {
      toast.error('Error al actualizar');
    }
  }

  async function toggleOnCourt(lineupId: string, isOnCourt: boolean) {
    try {
      await api.patch(`/stats/sessions/${params.sessionId}/lineup/${lineupId}`, { isOnCourt: !isOnCourt });
      fetchData();
    } catch {
      toast.error('Error al actualizar');
    }
  }

  function renderTeamLineup(
    lineup: LineupEntry[],
    teamName: string,
    participantId: string,
    roster: RosterPlayer[],
    side: 'home' | 'away',
  ) {
    const starters = lineup.filter(p => p.isStarter);
    const bench    = lineup.filter(p => !p.isStarter);

    return (
      <div className="flex-1 min-w-0">
        <div className="px-4 py-3 bg-[#181C25] border-b border-white/10">
          <h2 className="text-sm font-semibold text-white">{teamName}</h2>
          <p className="text-xs text-[#7A8098]">{lineup.length} jugadores registrados</p>
        </div>

        {isAdmin && (
          <div className="flex gap-2 px-3 pt-3">
            {roster.length > 0 && (
              <button
                onClick={() => setModal({ type: 'import', side })}
                className="flex-1 py-2 text-xs font-medium text-[#38BDF8] border border-[#38BDF8]/30 bg-[#38BDF8]/10 rounded-xl hover:bg-[#38BDF8]/20 transition"
              >
                Importar del plantel
              </button>
            )}
            <button
              onClick={() => setModal({ type: 'addPlayer', participantId })}
              className="flex-1 py-2 text-xs font-medium text-[#F97316] border border-[#F97316]/30 bg-[#F97316]/10 rounded-xl hover:bg-[#F97316]/20 transition"
            >
              + Agregar jugador
            </button>
          </div>
        )}

        <div className="p-3 space-y-4">
          {/* Starters */}
          <div>
            <div className="text-[10px] text-[#7A8098] uppercase tracking-widest mb-2">
              Titulares ({starters.length}/5)
            </div>
            {starters.length === 0 ? (
              <p className="text-xs text-[#7A8098] py-2">Sin titulares definidos</p>
            ) : (
              <div className="space-y-1.5">
                {starters.map(p => (
                  <PlayerRow
                    key={p.id}
                    player={p}
                    isAdmin={isAdmin}
                    onToggleStarter={toggleStarter}
                    onToggleOnCourt={toggleOnCourt}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Bench */}
          {bench.length > 0 && (
            <div>
              <div className="text-[10px] text-[#7A8098] uppercase tracking-widest mb-2">Banquillo</div>
              <div className="space-y-1.5">
                {bench.map(p => (
                  <PlayerRow
                    key={p.id}
                    player={p}
                    isAdmin={isAdmin}
                    onToggleStarter={toggleStarter}
                    onToggleOnCourt={toggleOnCourt}
                  />
                ))}
              </div>
            </div>
          )}

          {lineup.length === 0 && (
            <div className="text-center py-6 text-[#7A8098] text-sm">
              Sin jugadores en la alineación.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const homeExistingPlayerIds = new Set(homeLineup.map(l => l.playerId).filter((id): id is string => !!id));
  const awayExistingPlayerIds = new Set(awayLineup.map(l => l.playerId).filter((id): id is string => !!id));

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Modals */}
      {modal?.type === 'import' && session && (
        <ImportModal
          sessionId={params.sessionId}
          participantId={modal.side === 'home' ? session.home.participantId : session.away.participantId}
          teamName={modal.side === 'home' ? session.home.teamName : session.away.teamName}
          roster={modal.side === 'home' ? homeRoster : awayRoster}
          existingIds={modal.side === 'home' ? homeExistingPlayerIds : awayExistingPlayerIds}
          onClose={() => setModal(null)}
          onImported={() => { setModal(null); fetchData(); }}
        />
      )}
      {modal?.type === 'addPlayer' && (
        <AddPlayerModal
          sessionId={params.sessionId}
          participantId={modal.participantId}
          onClose={() => setModal(null)}
          onAdded={() => { setModal(null); fetchData(); }}
        />
      )}

      <NavTabs sessionId={params.sessionId} active="lineup" />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-bold text-white">Alineaciones</h1>
            <Link
              href={`/stats/${params.sessionId}/live`}
              className="px-3 py-1.5 bg-[#F97316] text-white text-xs font-medium rounded-lg hover:bg-orange-600 transition"
            >
              Ir a Live →
            </Link>
          </div>

          <div className="flex gap-4 flex-col md:flex-row">
            {session && (
              <>
                {renderTeamLineup(homeLineup, session.home.teamName, session.home.participantId, homeRoster, 'home')}
                <div className="w-px bg-white/10 hidden md:block" />
                {renderTeamLineup(awayLineup, session.away.teamName, session.away.participantId, awayRoster, 'away')}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerRow({
  player, isAdmin, onToggleStarter, onToggleOnCourt,
}: {
  player: LineupEntry;
  isAdmin: boolean;
  onToggleStarter: (id: string, current: boolean) => void;
  onToggleOnCourt: (id: string, current: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold text-white/70 flex-shrink-0">
        {player.number ?? '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-white truncate">{player.name}</div>
        <div className="text-[10px] text-[#7A8098]">{player.position ?? 'Sin posición'}</div>
      </div>
      {isAdmin && (
        <div className="flex gap-2 items-center flex-shrink-0">
          <button
            onClick={() => onToggleStarter(player.id, player.isStarter)}
            className={cn(
              'px-2 py-1 text-[10px] font-medium rounded-lg border transition',
              player.isStarter
                ? 'bg-[#F97316]/20 text-[#F97316] border-[#F97316]/30'
                : 'bg-white/5 text-[#7A8098] border-white/10 hover:bg-white/10'
            )}
          >
            {player.isStarter ? 'Titular' : 'Banco'}
          </button>
          <button
            onClick={() => onToggleOnCourt(player.id, player.isOnCourt)}
            className={cn(
              'px-2 py-1 text-[10px] font-medium rounded-lg border transition',
              player.isOnCourt
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-white/5 text-[#7A8098] border-white/10 hover:bg-white/10'
            )}
          >
            {player.isOnCourt ? 'En cancha' : 'Fuera'}
          </button>
        </div>
      )}
    </div>
  );
}
