'use client';

import { useEffect, useState, useCallback } from 'react';
import { Save, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

type Tab = 'record' | 'leaderboard';

interface Team    { id: string; name: string; category: string; }
interface Match   { id: string; opponent: string; date: string; status: string; team?: { id: string; name: string }; teamId: string; }
interface Player  { id: string; jerseyNumber?: number; user: { firstName: string; lastName: string }; }

interface StatRow {
  playerId:            string;
  points:              number;
  rebounds:            number;
  assists:             number;
  steals:              number;
  blocks:              number;
  turnovers:           number;
  fouls:               number;
  freeThrowsMade:      number;
  freeThrowsAttempted: number;
  minutes:             number;
}

interface LeaderboardRow {
  player: { id: string; jerseyNumber?: number; position?: string; user: { firstName: string; lastName: string } };
  gamesPlayed:         number;
  freeThrowsMade:      number;
  freeThrowsAttempted: number;
  freeThrowPct:        number | null;
  averages: { points?: number | null; rebounds?: number | null; assists?: number | null; steals?: number | null; blocks?: number | null; minutes?: number | null };
}

const STAT_COLS = ['PTS', 'REB', 'AST', 'ROB', 'BLQ', 'PÉR', 'FAL', 'TLC', 'TLA', 'MIN'] as const;
const STAT_KEYS: (keyof StatRow)[] = ['points', 'rebounds', 'assists', 'steals', 'blocks', 'turnovers', 'fouls', 'freeThrowsMade', 'freeThrowsAttempted', 'minutes'];

function avg(v: number | null | undefined) {
  if (v == null) return '—';
  return v.toFixed(1);
}

function selectClass(w = 'w-full') {
  return `${w} appearance-none px-3 py-2 pr-8 border border-border rounded-lg bg-surface text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary transition`;
}

export default function CoachStatsPage() {
  const [tab, setTab] = useState<Tab>('record');

  // --- Record tab state ---
  const [matches,   setMatches]   = useState<Match[]>([]);
  const [matchId,   setMatchId]   = useState('');
  const [players,   setPlayers]   = useState<Player[]>([]);
  const [statRows,  setStatRows]  = useState<Record<string, StatRow>>({});
  const [loadingMatch,  setLoadingMatch]  = useState(false);
  const [savingStats,   setSavingStats]   = useState(false);

  // --- Leaderboard tab state ---
  const [teams,       setTeams]       = useState<Team[]>([]);
  const [teamId,      setTeamId]      = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loadingLb,   setLoadingLb]   = useState(false);

  // Load matches + teams on mount
  useEffect(() => {
    Promise.all([api.get('/matches'), api.get('/teams')]).then(([mRes, tRes]) => {
      const completed = (mRes.data.data ?? []).filter((m: Match) => m.status === 'COMPLETED');
      setMatches(completed);
      if (completed.length > 0) setMatchId(completed[0].id);
      const ts = tRes.data.data ?? [];
      setTeams(ts);
      if (ts.length > 0) setTeamId(ts[0].id);
    }).catch(() => {});
  }, []);

  // Load players + existing stats when match changes
  const loadMatchData = useCallback(async (mid: string) => {
    const match = matches.find((m) => m.id === mid);
    if (!match) return;
    setLoadingMatch(true);
    try {
      const [pRes, sRes] = await Promise.all([
        api.get('/players', { params: { teamId: match.teamId, limit: 100 } }),
        api.get(`/stats/match/${mid}`),
      ]);
      const playerList: Player[] = pRes.data.data ?? [];
      setPlayers(playerList);
      const existingMap: Record<string, StatRow> = {};
      for (const s of (sRes.data.data ?? [])) {
        existingMap[s.playerId] = { playerId: s.playerId, points: s.points, rebounds: s.rebounds, assists: s.assists, steals: s.steals, blocks: s.blocks, turnovers: s.turnovers, fouls: s.fouls, freeThrowsMade: s.freeThrowsMade ?? 0, freeThrowsAttempted: s.freeThrowsAttempted ?? 0, minutes: s.minutes };
      }
      const rows: Record<string, StatRow> = {};
      for (const p of playerList) {
        rows[p.id] = existingMap[p.id] ?? { playerId: p.id, points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0, freeThrowsMade: 0, freeThrowsAttempted: 0, minutes: 0 };
      }
      setStatRows(rows);
    } catch { toast.error('Error al cargar datos del partido'); }
    finally { setLoadingMatch(false); }
  }, [matches]);

  useEffect(() => { if (matchId && matches.length > 0) loadMatchData(matchId); }, [matchId, matches, loadMatchData]);

  // Load leaderboard when team changes
  const loadLeaderboard = useCallback(async (tid: string) => {
    setLoadingLb(true);
    try {
      const res = await api.get('/stats/leaderboard', { params: { teamId: tid } });
      setLeaderboard(res.data.data ?? []);
    } catch { toast.error('Error al cargar leaderboard'); }
    finally { setLoadingLb(false); }
  }, []);

  useEffect(() => { if (teamId) loadLeaderboard(teamId); }, [teamId, loadLeaderboard]);

  const setStat = (playerId: string, key: keyof StatRow, val: string) => {
    const n = parseInt(val, 10);
    setStatRows((prev) => ({ ...prev, [playerId]: { ...prev[playerId], [key]: isNaN(n) ? 0 : Math.max(0, n) } }));
  };

  const handleSaveStats = async () => {
    setSavingStats(true);
    try {
      await api.post('/stats/match', {
        matchId,
        stats: Object.values(statRows),
      });
      toast.success('Estadísticas guardadas');
      loadLeaderboard(teamId);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Error al guardar');
    } finally { setSavingStats(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary">Estadísticas</h1>
        <p className="text-muted-foreground">Registrá el rendimiento por partido y consultá el ranking</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {([['record', 'Registrar partido'], ['leaderboard', 'Ranking del equipo']] as [Tab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition',
              tab === key ? 'bg-surface text-secondary shadow-sm' : 'text-muted-foreground hover:text-secondary'
            )}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Record tab ── */}
      {tab === 'record' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <select value={matchId} onChange={(e) => setMatchId(e.target.value)} className={selectClass()}>
                {matches.length === 0
                  ? <option value="">Sin partidos finalizados</option>
                  : matches.map((m) => (
                    <option key={m.id} value={m.id}>
                      🏀 {m.team?.name} vs. {m.opponent} — {new Date(m.date).toLocaleDateString('es-AR')}
                    </option>
                  ))
                }
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            <button
              onClick={handleSaveStats}
              disabled={savingStats || loadingMatch || players.length === 0}
              className="flex items-center gap-2 bg-primary hover:bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg transition text-sm disabled:opacity-60"
            >
              <Save size={14} />
              {savingStats ? 'Guardando...' : 'Guardar'}
            </button>
          </div>

          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Jugador</th>
                    {STAT_COLS.map((h) => (
                      <th key={h} className="text-center px-2 py-3 font-medium text-muted-foreground w-14">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingMatch ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse w-32" /></td>
                        {STAT_KEYS.map((_, j) => <td key={j} className="px-2 py-3"><div className="h-8 bg-muted rounded animate-pulse" /></td>)}
                      </tr>
                    ))
                  ) : players.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                      {matches.length === 0 ? 'No hay partidos finalizados para cargar estadísticas.' : 'Seleccioná un partido.'}
                    </td></tr>
                  ) : (
                    players.map((p) => {
                      const row = statRows[p.id] ?? { playerId: p.id, points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0, minutes: 0 };
                      return (
                        <tr key={p.id} className="border-b border-border hover:bg-muted/30 transition">
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                                {p.user.firstName[0]}{p.user.lastName[0]}
                              </div>
                              <span className="font-medium text-secondary">{p.user.firstName} {p.user.lastName}</span>
                              {p.jerseyNumber != null && <span className="text-xs text-muted-foreground">#{p.jerseyNumber}</span>}
                            </div>
                          </td>
                          {STAT_KEYS.map((key) => (
                            <td key={key} className="px-1 py-2">
                              <input
                                type="number"
                                min="0"
                                max={key === 'fouls' ? 6 : key === 'minutes' ? 48 : 99}
                                value={row[key] as number}
                                onChange={(e) => setStat(p.id, key, e.target.value)}
                                className="w-14 text-center px-1 py-1.5 border border-border rounded-lg bg-surface text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary transition"
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Leaderboard tab ── */}
      {tab === 'leaderboard' && (
        <div className="space-y-4">
          <div className="relative w-full max-w-sm">
            <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className={selectClass()}>
              {teams.length === 0
                ? <option value="">Sin equipos</option>
                : teams.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.category}</option>)
              }
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>

          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Jugador</th>
                    <th className="text-center px-3 py-3 font-medium text-muted-foreground">PJ</th>
                    {['PTS', 'REB', 'AST', 'ROB', 'BLQ', 'MIN', '%TL'].map((h) => (
                      <th key={h} className="text-center px-3 py-3 font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingLb ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-border">
                        {Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>)}
                      </tr>
                    ))
                  ) : leaderboard.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                      No hay estadísticas registradas para este equipo.
                    </td></tr>
                  ) : (
                    leaderboard
                      .sort((a, b) => (b.averages.points ?? 0) - (a.averages.points ?? 0))
                      .map((row, idx) => (
                        <tr key={row.player.id} className="border-b border-border hover:bg-muted/40 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-muted-foreground w-4">{idx + 1}</span>
                              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                                {row.player.user.firstName[0]}{row.player.user.lastName[0]}
                              </div>
                              <div>
                                <p className="font-medium text-secondary">{row.player.user.firstName} {row.player.user.lastName}</p>
                                {row.player.position && <p className="text-xs text-muted-foreground">{row.player.position}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center text-muted-foreground">{row.gamesPlayed}</td>
                          {(['points', 'rebounds', 'assists', 'steals', 'blocks', 'minutes'] as const).map((key) => (
                            <td key={key} className={cn('px-3 py-3 text-center font-medium', key === 'points' ? 'text-primary' : 'text-secondary')}>
                              {avg(row.averages[key])}
                            </td>
                          ))}
                          <td className="px-3 py-3 text-center font-medium text-secondary">
                            {row.freeThrowPct != null
                              ? <span title={`${row.freeThrowsMade}/${row.freeThrowsAttempted}`}>{row.freeThrowPct}%</span>
                              : '—'}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
