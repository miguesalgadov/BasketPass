'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────────

interface TeamInfo {
  id: string;
  name: string;
}

interface MatchDetail {
  id: string;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  homeScore?: number;
  awayScore?: number;
  homeQ1?: number; homeQ2?: number; homeQ3?: number; homeQ4?: number; homeOT?: number;
  awayQ1?: number; awayQ2?: number; awayQ3?: number; awayQ4?: number; awayOT?: number;
  status: string;
  walkoverTeamId?: string;
  scheduledAt?: string;
}

interface PlayerInfo {
  id: string;
  firstName: string;
  lastName: string;
  number?: number;
}

interface PlayerStats {
  playerId: string;
  dnp: boolean;
  minutes: number;
  points: number;
  twoPointsMade: number;
  twoPointsAttempted: number;
  threePointsMade: number;
  threePointsAttempted: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
  offensiveRebounds: number;
  defensiveRebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  personalFouls: number;
  technicalFouls: number;
  plusMinus: number;
}

function defaultPlayerStats(playerId: string): PlayerStats {
  return {
    playerId,
    dnp: false,
    minutes: 0,
    points: 0,
    twoPointsMade: 0,
    twoPointsAttempted: 0,
    threePointsMade: 0,
    threePointsAttempted: 0,
    freeThrowsMade: 0,
    freeThrowsAttempted: 0,
    offensiveRebounds: 0,
    defensiveRebounds: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
    turnovers: 0,
    personalFouls: 0,
    technicalFouls: 0,
    plusMinus: 0,
  };
}

// ── Small numeric input ────────────────────────────────────────────────────────

function NumInput({
  value,
  onChange,
  disabled,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <input
      type="number"
      min={0}
      max={999}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
      className={cn(
        'w-10 text-center px-1 py-1 rounded border border-border bg-surface text-secondary text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition disabled:opacity-40 disabled:bg-muted',
        className
      )}
    />
  );
}

// ── Big score input ────────────────────────────────────────────────────────────

function ScoreInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-muted-foreground font-medium truncate max-w-[100px] text-center">
        {label}
      </span>
      <input
        type="number"
        min={0}
        max={999}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        className="w-20 text-center text-3xl font-bold px-2 py-3 rounded-xl border-2 border-border bg-surface text-secondary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition disabled:opacity-40 disabled:bg-muted"
      />
    </div>
  );
}

// ── Stats row for a player ─────────────────────────────────────────────────────

function PlayerStatsRow({
  player,
  stats,
  onChange,
}: {
  player: PlayerInfo;
  stats: PlayerStats;
  onChange: (updated: PlayerStats) => void;
}) {
  function set(field: keyof PlayerStats, val: number | boolean) {
    onChange({ ...stats, [field]: val });
  }

  return (
    <tr className={cn('border-b border-border last:border-0', stats.dnp && 'opacity-50')}>
      {/* Player */}
      <td className="px-3 py-2 whitespace-nowrap">
        <div className="flex items-center gap-2">
          {player.number !== undefined && (
            <span className="text-xs text-muted-foreground w-5 text-right">
              {player.number}
            </span>
          )}
          <span className="text-sm text-secondary font-medium">
            {player.firstName} {player.lastName}
          </span>
        </div>
      </td>

      {/* DNP toggle */}
      <td className="px-2 py-2 text-center">
        <button
          type="button"
          onClick={() => set('dnp', !stats.dnp)}
          className={cn(
            'text-xs font-medium px-2 py-0.5 rounded border transition',
            stats.dnp
              ? 'bg-muted text-muted-foreground border-border'
              : 'bg-surface text-secondary border-border hover:border-primary'
          )}
        >
          {stats.dnp ? 'DNP' : 'JUG'}
        </button>
      </td>

      {/* Stats columns */}
      {!stats.dnp ? (
        <>
          <td className="px-1 py-2 text-center"><NumInput value={stats.minutes} onChange={(v) => set('minutes', v)} /></td>
          <td className="px-1 py-2 text-center"><NumInput value={stats.points} onChange={(v) => set('points', v)} /></td>
          <td className="px-1 py-2 text-center">
            <div className="flex items-center gap-0.5">
              <NumInput value={stats.twoPointsMade} onChange={(v) => set('twoPointsMade', v)} />
              <span className="text-muted-foreground text-xs">/</span>
              <NumInput value={stats.twoPointsAttempted} onChange={(v) => set('twoPointsAttempted', v)} />
            </div>
          </td>
          <td className="px-1 py-2 text-center">
            <div className="flex items-center gap-0.5">
              <NumInput value={stats.threePointsMade} onChange={(v) => set('threePointsMade', v)} />
              <span className="text-muted-foreground text-xs">/</span>
              <NumInput value={stats.threePointsAttempted} onChange={(v) => set('threePointsAttempted', v)} />
            </div>
          </td>
          <td className="px-1 py-2 text-center">
            <div className="flex items-center gap-0.5">
              <NumInput value={stats.freeThrowsMade} onChange={(v) => set('freeThrowsMade', v)} />
              <span className="text-muted-foreground text-xs">/</span>
              <NumInput value={stats.freeThrowsAttempted} onChange={(v) => set('freeThrowsAttempted', v)} />
            </div>
          </td>
          <td className="px-1 py-2 text-center"><NumInput value={stats.offensiveRebounds} onChange={(v) => set('offensiveRebounds', v)} /></td>
          <td className="px-1 py-2 text-center"><NumInput value={stats.defensiveRebounds} onChange={(v) => set('defensiveRebounds', v)} /></td>
          <td className="px-1 py-2 text-center"><NumInput value={stats.assists} onChange={(v) => set('assists', v)} /></td>
          <td className="px-1 py-2 text-center"><NumInput value={stats.steals} onChange={(v) => set('steals', v)} /></td>
          <td className="px-1 py-2 text-center"><NumInput value={stats.blocks} onChange={(v) => set('blocks', v)} /></td>
          <td className="px-1 py-2 text-center"><NumInput value={stats.turnovers} onChange={(v) => set('turnovers', v)} /></td>
          <td className="px-1 py-2 text-center"><NumInput value={stats.personalFouls} onChange={(v) => set('personalFouls', v)} /></td>
          <td className="px-1 py-2 text-center"><NumInput value={stats.technicalFouls} onChange={(v) => set('technicalFouls', v)} /></td>
          <td className="px-1 py-2 text-center">
            <input
              type="number"
              value={stats.plusMinus}
              onChange={(e) => set('plusMinus', Number(e.target.value))}
              className="w-12 text-center px-1 py-1 rounded border border-border bg-surface text-secondary text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition"
            />
          </td>
        </>
      ) : (
        <td colSpan={14} className="px-3 py-2 text-center text-xs text-muted-foreground italic">
          No jugó
        </td>
      )}
    </tr>
  );
}

// ── Stats section for one team ─────────────────────────────────────────────────

function TeamStatsSection({
  teamName,
  players,
  statsMap,
  onStatsChange,
  teamScore,
}: {
  teamName: string;
  players: PlayerInfo[];
  statsMap: Record<string, PlayerStats>;
  onStatsChange: (playerId: string, stats: PlayerStats) => void;
  teamScore: number;
}) {
  const totalPoints = Object.values(statsMap)
    .filter((s) => !s.dnp)
    .reduce((sum, s) => sum + s.points, 0);

  const mismatch = totalPoints !== teamScore && players.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-secondary">{teamName}</h4>
        {mismatch && (
          <div className="flex items-center gap-1.5 text-xs text-warning">
            <AlertTriangle size={13} />
            <span>
              Suma individual: {totalPoints} · Marcador: {teamScore}
            </span>
          </div>
        )}
        {!mismatch && totalPoints > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-success">
            <CheckCircle2 size={13} />
            <span>Puntos coinciden</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted text-muted-foreground uppercase tracking-wide">
              <th className="px-3 py-2 text-left">Jugador</th>
              <th className="px-2 py-2">-</th>
              <th className="px-1 py-2">MIN</th>
              <th className="px-1 py-2">PTS</th>
              <th className="px-1 py-2">2P</th>
              <th className="px-1 py-2">3P</th>
              <th className="px-1 py-2">TL</th>
              <th className="px-1 py-2">RO</th>
              <th className="px-1 py-2">RD</th>
              <th className="px-1 py-2">AST</th>
              <th className="px-1 py-2">ROB</th>
              <th className="px-1 py-2">BLQ</th>
              <th className="px-1 py-2">PER</th>
              <th className="px-1 py-2">FP</th>
              <th className="px-1 py-2">FT</th>
              <th className="px-1 py-2">+/-</th>
            </tr>
          </thead>
          <tbody className="bg-surface divide-y divide-border">
            {players.map((p) => (
              <PlayerStatsRow
                key={p.id}
                player={p}
                stats={statsMap[p.id] ?? defaultPlayerStats(p.id)}
                onChange={(updated) => onStatsChange(p.id, updated)}
              />
            ))}
            {players.length === 0 && (
              <tr>
                <td
                  colSpan={16}
                  className="px-4 py-6 text-center text-muted-foreground text-sm"
                >
                  No hay jugadores registrados para este equipo
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function CargarResultadoPage() {
  const params = useParams<{ id: string; matchId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'CLUB_ADMIN' || user?.role === 'SUPER_ADMIN';
  const isCoach = user?.role === 'COACH';

  // Redirect if not authorized
  useEffect(() => {
    if (user && !isAdmin && !isCoach) {
      router.replace(`/campeonatos/${params.id}/fixture`);
    }
  }, [user, isAdmin, isCoach, router, params.id]);

  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [homePlayers, setHomePlayers] = useState<PlayerInfo[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<PlayerInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Result form
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [showQuarters, setShowQuarters] = useState(false);
  const [quarters, setQuarters] = useState({
    homeQ1: 0, homeQ2: 0, homeQ3: 0, homeQ4: 0, homeOT: 0,
    awayQ1: 0, awayQ2: 0, awayQ3: 0, awayQ4: 0, awayOT: 0,
  });
  const [isWalkover, setIsWalkover] = useState(false);
  const [walkoverTeamId, setWalkoverTeamId] = useState('');
  const [savingResult, setSavingResult] = useState(false);

  // Stats section
  const [statsOpen, setStatsOpen] = useState(false);
  const [homeStatsMap, setHomeStatsMap] = useState<Record<string, PlayerStats>>({});
  const [awayStatsMap, setAwayStatsMap] = useState<Record<string, PlayerStats>>({});
  const [savingStats, setSavingStats] = useState(false);

  const fetchMatch = useCallback(async () => {
    try {
      // Fetch rounds to find match detail
      const roundsRes = await api.get(`/championships/${params.id}/rounds`);
      const rounds = roundsRes.data.data ?? roundsRes.data;
      let foundMatch: MatchDetail | null = null;
      for (const round of rounds) {
        const m = round.matches?.find((m: any) => m.id === params.matchId);
        if (m) { foundMatch = m; break; }
      }
      if (foundMatch) {
        setMatch(foundMatch);
        setHomeScore(foundMatch.homeScore ?? 0);
        setAwayScore(foundMatch.awayScore ?? 0);
        setQuarters({
          homeQ1: foundMatch.homeQ1 ?? 0,
          homeQ2: foundMatch.homeQ2 ?? 0,
          homeQ3: foundMatch.homeQ3 ?? 0,
          homeQ4: foundMatch.homeQ4 ?? 0,
          homeOT: foundMatch.homeOT ?? 0,
          awayQ1: foundMatch.awayQ1 ?? 0,
          awayQ2: foundMatch.awayQ2 ?? 0,
          awayQ3: foundMatch.awayQ3 ?? 0,
          awayQ4: foundMatch.awayQ4 ?? 0,
          awayOT: foundMatch.awayOT ?? 0,
        });
        if (foundMatch.walkoverTeamId) {
          setIsWalkover(true);
          setWalkoverTeamId(foundMatch.walkoverTeamId);
        }

        // Fetch players for each team
        try {
          const [homeRes, awayRes] = await Promise.all([
            api.get(`/teams/${foundMatch.homeTeam.id}/players`),
            api.get(`/teams/${foundMatch.awayTeam.id}/players`),
          ]);
          setHomePlayers(homeRes.data.data ?? homeRes.data);
          setAwayPlayers(awayRes.data.data ?? awayRes.data);
        } catch {
          // Teams may not have player lists — that's fine
        }
      }
    } catch {
      toast.error('Error al cargar partido');
    } finally {
      setLoading(false);
    }
  }, [params.id, params.matchId]);

  useEffect(() => {
    fetchMatch();
  }, [fetchMatch]);

  // Initialize stats map when players load
  useEffect(() => {
    const map: Record<string, PlayerStats> = {};
    for (const p of homePlayers) map[p.id] = defaultPlayerStats(p.id);
    setHomeStatsMap(map);
  }, [homePlayers]);

  useEffect(() => {
    const map: Record<string, PlayerStats> = {};
    for (const p of awayPlayers) map[p.id] = defaultPlayerStats(p.id);
    setAwayStatsMap(map);
  }, [awayPlayers]);

  async function handleSaveResult() {
    setSavingResult(true);
    try {
      const payload: Record<string, unknown> = {
        homeScore,
        awayScore,
      };
      if (showQuarters) {
        Object.assign(payload, quarters);
      }
      await api.patch(
        `/championships/${params.id}/matches/${params.matchId}`,
        payload
      );
      toast.success('Resultado guardado');
      fetchMatch();
    } catch (err: any) {
      toast.error(
        err.response?.data?.error?.message ?? 'Error al guardar resultado'
      );
    } finally {
      setSavingResult(false);
    }
  }

  async function handleSaveWalkover() {
    if (!walkoverTeamId) {
      toast.error('Seleccioná el equipo que pierde por walkover');
      return;
    }
    setSavingResult(true);
    try {
      await api.post(
        `/championships/${params.id}/matches/${params.matchId}/walkover`,
        { walkoverTeamId }
      );
      toast.success('Walkover registrado');
      fetchMatch();
    } catch (err: any) {
      toast.error(
        err.response?.data?.error?.message ?? 'Error al registrar walkover'
      );
    } finally {
      setSavingResult(false);
    }
  }

  async function handleSaveStats() {
    setSavingStats(true);
    try {
      const allStats = [
        ...Object.values(homeStatsMap),
        ...Object.values(awayStatsMap),
      ];
      await api.post(
        `/championships/${params.id}/matches/${params.matchId}/stats`,
        { playerStats: allStats }
      );
      toast.success('Estadísticas guardadas');
    } catch (err: any) {
      toast.error(
        err.response?.data?.error?.message ?? 'Error al guardar estadísticas'
      );
    } finally {
      setSavingStats(false);
    }
  }

  if (loading || !match) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="h-40 bg-muted rounded-xl" />
        <div className="h-32 bg-muted rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-secondary transition"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-secondary">Cargar resultado</h1>
          <p className="text-sm text-muted-foreground">
            {match.homeTeam.name} vs {match.awayTeam.name}
          </p>
        </div>
      </div>

      {/* ── Section 1: Result ──────────────────────────────────────────────── */}
      <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
        <h2 className="font-semibold text-secondary border-b border-border pb-3">
          Resultado del partido
        </h2>

        {/* Walkover toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-secondary">Walkover</p>
            <p className="text-xs text-muted-foreground">
              Un equipo no se presentó al partido
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsWalkover((v) => !v)}
            className={cn(
              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
              isWalkover ? 'bg-danger' : 'bg-muted'
            )}
          >
            <span
              className={cn(
                'inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out',
                isWalkover ? 'translate-x-5' : 'translate-x-0'
              )}
            />
          </button>
        </div>

        {isWalkover ? (
          /* Walkover mode */
          <div className="space-y-3">
            <label className="block text-sm font-medium text-secondary">
              Equipo que pierde por walkover (no se presentó)
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setWalkoverTeamId(match.homeTeam.id)}
                className={cn(
                  'flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition',
                  walkoverTeamId === match.homeTeam.id
                    ? 'border-danger bg-danger/10 text-danger'
                    : 'border-border text-muted-foreground hover:border-danger/40'
                )}
              >
                {match.homeTeam.name}
              </button>
              <button
                type="button"
                onClick={() => setWalkoverTeamId(match.awayTeam.id)}
                className={cn(
                  'flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition',
                  walkoverTeamId === match.awayTeam.id
                    ? 'border-danger bg-danger/10 text-danger'
                    : 'border-border text-muted-foreground hover:border-danger/40'
                )}
              >
                {match.awayTeam.name}
              </button>
            </div>
            <button
              onClick={handleSaveWalkover}
              disabled={savingResult || !walkoverTeamId}
              className="flex items-center gap-2 w-full justify-center py-2.5 text-sm font-semibold bg-danger hover:bg-danger/90 text-white rounded-lg transition disabled:opacity-60"
            >
              {savingResult ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              Registrar walkover
            </button>
          </div>
        ) : (
          /* Score mode */
          <div className="space-y-5">
            {/* Main scores */}
            <div className="flex items-center justify-center gap-8">
              <ScoreInput
                label={match.homeTeam.name}
                value={homeScore}
                onChange={setHomeScore}
              />
              <span className="text-3xl font-bold text-muted-foreground mt-6">
                —
              </span>
              <ScoreInput
                label={match.awayTeam.name}
                value={awayScore}
                onChange={setAwayScore}
              />
            </div>

            {/* Quarter toggle */}
            <div>
              <button
                type="button"
                onClick={() => setShowQuarters((v) => !v)}
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-600 font-medium transition"
              >
                {showQuarters ? (
                  <ChevronUp size={15} />
                ) : (
                  <ChevronDown size={15} />
                )}
                {showQuarters
                  ? 'Ocultar desglose por cuarto'
                  : 'Agregar desglose por cuarto (opcional)'}
              </button>

              {showQuarters && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm border border-border rounded-xl overflow-hidden">
                    <thead>
                      <tr className="bg-muted text-muted-foreground text-xs uppercase">
                        <th className="px-3 py-2 text-left">Equipo</th>
                        <th className="px-3 py-2 text-center">Q1</th>
                        <th className="px-3 py-2 text-center">Q2</th>
                        <th className="px-3 py-2 text-center">Q3</th>
                        <th className="px-3 py-2 text-center">Q4</th>
                        <th className="px-3 py-2 text-center">OT</th>
                      </tr>
                    </thead>
                    <tbody className="bg-surface divide-y divide-border">
                      <tr>
                        <td className="px-3 py-2 font-medium text-secondary">
                          {match.homeTeam.name}
                        </td>
                        {(['homeQ1', 'homeQ2', 'homeQ3', 'homeQ4', 'homeOT'] as const).map((k) => (
                          <td key={k} className="px-3 py-2 text-center">
                            <NumInput
                              value={quarters[k]}
                              onChange={(v) =>
                                setQuarters((p) => ({ ...p, [k]: v }))
                              }
                              className="w-12"
                            />
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-medium text-secondary">
                          {match.awayTeam.name}
                        </td>
                        {(['awayQ1', 'awayQ2', 'awayQ3', 'awayQ4', 'awayOT'] as const).map((k) => (
                          <td key={k} className="px-3 py-2 text-center">
                            <NumInput
                              value={quarters[k]}
                              onChange={(v) =>
                                setQuarters((p) => ({ ...p, [k]: v }))
                              }
                              className="w-12"
                            />
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Save result button */}
            <button
              onClick={handleSaveResult}
              disabled={savingResult}
              className="flex items-center gap-2 w-full justify-center py-2.5 text-sm font-semibold bg-primary hover:bg-primary-600 text-white rounded-lg transition disabled:opacity-60"
            >
              {savingResult ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              Guardar resultado
            </button>
          </div>
        )}
      </div>

      {/* ── Section 2: Player stats (collapsible) ─────────────────────────── */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setStatsOpen((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/40 transition"
        >
          <div className="text-left">
            <p className="font-semibold text-secondary">
              Estadísticas individuales
            </p>
            <p className="text-xs text-muted-foreground">
              Opcional · Podés cargar esto más tarde
            </p>
          </div>
          {statsOpen ? (
            <ChevronUp size={18} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={18} className="text-muted-foreground" />
          )}
        </button>

        {statsOpen && (
          <div className="px-6 pb-6 space-y-6 border-t border-border pt-5">
            <TeamStatsSection
              teamName={match.homeTeam.name}
              players={homePlayers}
              statsMap={homeStatsMap}
              onStatsChange={(pid, stats) =>
                setHomeStatsMap((p) => ({ ...p, [pid]: stats }))
              }
              teamScore={homeScore}
            />
            <TeamStatsSection
              teamName={match.awayTeam.name}
              players={awayPlayers}
              statsMap={awayStatsMap}
              onStatsChange={(pid, stats) =>
                setAwayStatsMap((p) => ({ ...p, [pid]: stats }))
              }
              teamScore={awayScore}
            />

            <button
              onClick={handleSaveStats}
              disabled={savingStats}
              className="flex items-center gap-2 justify-center py-2.5 px-6 text-sm font-semibold bg-secondary hover:bg-secondary/90 text-white rounded-lg transition disabled:opacity-60"
            >
              {savingStats ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              Guardar estadísticas
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
