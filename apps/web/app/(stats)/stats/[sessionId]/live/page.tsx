'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { ScoreBoard } from '@/components/stats/ScoreBoard';
import { PlayerGrid, type LineupPlayer } from '@/components/stats/PlayerGrid';
import { ActionPanel } from '@/components/stats/ActionPanel';
import { PlayByPlayLog, type Play } from '@/components/stats/PlayByPlayLog';
import { ShotModal } from '@/components/stats/ShotModal';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TeamLineup {
  participantId: string;
  teamName: string;
  color: string;
  players: LineupPlayer[];
}

interface GameState {
  sessionId: string;
  matchId: string;
  status: string;
  period: number;
  clockSeconds: number;
  homeScore: number;
  awayScore: number;
  homeTimeouts: number;
  awayTimeouts: number;
  periodScores: { home: number[]; away: number[] };
  home: TeamLineup;
  away: TeamLineup;
  plays: Play[];
}

const SHOT_ACTIONS = new Set([
  'FG2_MADE', 'FG2_MISSED', 'FG3_MADE', 'FG3_MISSED', 'FT_MADE', 'FT_MISSED',
]);

function getBaseUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';
  const base = apiUrl.replace('/api/v1', '');
  return base.startsWith('http') ? base : '';
}

// ── Flash message component ───────────────────────────────────────────────────

function FlashMessage({ message, type }: { message: string; type: 'success' | 'error' | 'info' }) {
  const colors = {
    success: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    error:   'bg-red-500/20 text-red-300 border-red-500/30',
    info:    'bg-[#38BDF8]/20 text-[#38BDF8] border-[#38BDF8]/30',
  };
  return (
    <div className={cn(
      'fixed top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl border text-xs font-medium shadow-xl animate-in fade-in slide-in-from-top-2',
      colors[type]
    )}>
      {message}
    </div>
  );
}

// ── Navigation tabs ───────────────────────────────────────────────────────────

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

// ── Team panel ────────────────────────────────────────────────────────────────

function TeamPanel({
  lineup,
  selectedId,
  activeTeam,
  side,
  onSelectPlayer,
  onSelectTeam,
}: {
  lineup: TeamLineup;
  selectedId: string | null;
  activeTeam: 'home' | 'away' | null;
  side: 'home' | 'away';
  onSelectPlayer: (id: string) => void;
  onSelectTeam: (side: 'home' | 'away') => void;
}) {
  const isActive = activeTeam === side;

  function handlePlayerSelect(id: string) {
    if (activeTeam !== side) onSelectTeam(side);
    onSelectPlayer(id);
  }

  return (
    <div
      className={cn(
        'flex flex-col border-r border-white/10 transition-all',
        isActive ? 'flex-[1.2]' : 'flex-1'
      )}
    >
      <button
        onClick={() => onSelectTeam(side)}
        className={cn(
          'w-full px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider transition border-b border-white/10',
          isActive ? 'text-white bg-white/10' : 'text-[#7A8098] hover:bg-white/5'
        )}
        style={isActive ? { borderBottom: `2px solid ${lineup.color}` } : undefined}
      >
        {lineup.teamName}
      </button>
      <PlayerGrid
        players={lineup.players}
        selectedId={isActive ? selectedId : null}
        teamColor={lineup.color}
        onSelect={handlePlayerSelect}
      />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LiveStatsPage() {
  const params  = useParams<{ sessionId: string }>();
  const router  = useRouter();
  const { user } = useAuthStore();

  const socketRef      = useRef<Socket | null>(null);
  const intervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const localClockRef  = useRef<number>(600);

  const [gameState, setGameState]   = useState<GameState | null>(null);
  const [connected, setConnected]   = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [selectedLineupId, setSelectedLineupId] = useState<string | null>(null);
  const [activeTeam, setActiveTeam] = useState<'home' | 'away' | null>('home');
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [displayClock, setDisplayClock] = useState<number | null>(null);

  const clockSeconds = displayClock ?? gameState?.clockSeconds ?? 600;

  // Derived: which players list is active
  const activePlayers = gameState
    ? activeTeam === 'home' ? gameState.home.players : gameState.away.players
    : [];
  const selectedPlayer = activePlayers.find(p => p.id === selectedLineupId) ?? null;

  const role = user?.role as string | undefined;
  const canControl = role === 'CLUB_ADMIN' || role === 'SUPER_ADMIN' || role === 'COACH' || role === 'STATISTICIAN';

  // ── Clock helpers ───────────────────────────────────────────────────────────

  function clearClockInterval() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function syncClockToServer(seconds: number) {
    socketRef.current?.emit('clock:update', {
      sessionId: params.sessionId,
      clockSeconds: seconds,
    });
  }

  function stopClock() {
    clearClockInterval();
    setIsRunning(false);
    syncClockToServer(localClockRef.current);
  }

  function startClock(from?: number) {
    clearClockInterval();
    const start = from ?? localClockRef.current;
    localClockRef.current = start;
    setDisplayClock(start);
    setIsRunning(true);

    intervalRef.current = setInterval(() => {
      localClockRef.current = Math.max(0, localClockRef.current - 1);
      setDisplayClock(localClockRef.current);
      if (localClockRef.current === 0) {
        clearClockInterval();
        setIsRunning(false);
        syncClockToServer(0);
      }
    }, 1000);
  }

  const handleClockToggle = useCallback(async () => {
    if (isRunning) {
      stopClock();
      return;
    }
    // Auto-start session on first clock start
    if (gameState?.status === 'NOT_STARTED') {
      try {
        await api.post(`/stats/sessions/${params.sessionId}/start`);
        setGameState(prev => prev ? { ...prev, status: 'LIVE' } : prev);
      } catch {
        showFlash('Error al iniciar el partido', 'error');
        return;
      }
    }
    startClock();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, gameState?.status, params.sessionId]);

  const handleClockEdit = useCallback((seconds: number) => {
    clearClockInterval();
    setIsRunning(false);
    localClockRef.current = seconds;
    setDisplayClock(seconds);
    syncClockToServer(seconds);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.sessionId]);

  function showFlash(message: string, type: 'success' | 'error' | 'info' = 'success') {
    setFlash({ message, type });
    setTimeout(() => setFlash(null), 2500);
  }

  // ── WebSocket setup ─────────────────────────────────────────────────────────

  useEffect(() => {
    const baseUrl = getBaseUrl();
    if (!baseUrl) return; // Socket.io not available in serverless deployment
    const token   = useAuthStore.getState().accessToken ?? localStorage.getItem('accessToken');

    const socket = io(`${baseUrl}/stats`, {
      transports: ['websocket'],
      auth: { token },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setError(null);
      socket.emit('join:match', { sessionId: params.sessionId, token });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('connect_error', (err) => {
      setError(`Error de conexión: ${err.message}`);
    });

    socket.on('error', (err: { message: string }) => {
      showFlash(err.message ?? 'Error', 'error');
    });

    socket.on('state:sync', (state: GameState) => {
      setGameState(state);
      localClockRef.current = state.clockSeconds;
      setDisplayClock(state.clockSeconds);
    });

    socket.on('action:logged', (data: any) => {
      setGameState(prev => {
        if (!prev) return prev;
        const p = data.play ?? {};
        const newPlay: Play = {
          id:           p.id ?? `${Date.now()}`,
          period:       p.period ?? prev.period,
          clockSeconds: p.clockSeconds ?? prev.clockSeconds,
          team:         p.team,
          actionType:   p.actionType,
          points:       p.points ?? 0,
          homeScore:    data.scoreUpdate?.home ?? prev.homeScore,
          awayScore:    data.scoreUpdate?.away ?? prev.awayScore,
          playerName:   undefined,
        };
        const lineups = data.lineups;
        return {
          ...prev,
          homeScore: data.scoreUpdate?.home ?? prev.homeScore,
          awayScore: data.scoreUpdate?.away ?? prev.awayScore,
          plays: [newPlay, ...prev.plays].slice(0, 30),
          home: lineups ? { ...prev.home, players: lineups.home } : prev.home,
          away: lineups ? { ...prev.away, players: lineups.away } : prev.away,
        };
      });
      showFlash('Acción registrada', 'success');
    });

    socket.on('action:reverted', (data: any) => {
      setGameState(prev => {
        if (!prev) return prev;
        const lineups = data?.lineups;
        return {
          ...prev,
          homeScore: data?.scoreUpdate?.home ?? prev.homeScore,
          awayScore: data?.scoreUpdate?.away ?? prev.awayScore,
          plays: data?.undonePlayId
            ? prev.plays.filter(p => p.id !== data.undonePlayId)
            : prev.plays,
          home: lineups ? { ...prev.home, players: lineups.home } : prev.home,
          away: lineups ? { ...prev.away, players: lineups.away } : prev.away,
        };
      });
      showFlash('Acción deshecha', 'info');
    });

    socket.on('clock:updated', (data: { clockSeconds: number }) => {
      localClockRef.current = data.clockSeconds;
      setDisplayClock(data.clockSeconds);
      setGameState(prev => prev ? { ...prev, clockSeconds: data.clockSeconds } : prev);
    });

    socket.on('period:changed', (data: { period: number; clockSeconds?: number; periodScores?: any }) => {
      const newClock = data.clockSeconds ?? 600;
      clearClockInterval();
      setIsRunning(false);
      localClockRef.current = newClock;
      setDisplayClock(newClock);
      setGameState(prev => prev ? {
        ...prev,
        period: data.period,
        clockSeconds: newClock,
        periodScores: data.periodScores ?? prev.periodScores,
      } : prev);
      showFlash(`Período ${data.period}`, 'info');
    });

    socket.on('match:finished', () => {
      setGameState(prev => prev ? { ...prev, status: 'FINISHED' } : prev);
      showFlash('Partido finalizado', 'info');
    });

    socket.on('timeout:called', (data: { team: 'home' | 'away' }) => {
      setGameState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          homeTimeouts: data.team === 'home' ? Math.max(0, prev.homeTimeouts - 1) : prev.homeTimeouts,
          awayTimeouts: data.team === 'away' ? Math.max(0, prev.awayTimeouts - 1) : prev.awayTimeouts,
        };
      });
    });

    return () => {
      socket.disconnect();
      clearClockInterval();
    };
  }, [params.sessionId]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSelectPlayer = useCallback((id: string) => {
    setSelectedLineupId(prev => prev === id ? null : id);
  }, []);

  const handleSelectTeam = useCallback((side: 'home' | 'away') => {
    setActiveTeam(side);
    setSelectedLineupId(null);
  }, []);

  const handleAction = useCallback((action: string) => {
    if (!selectedLineupId || !activeTeam) return;
    if (SHOT_ACTIONS.has(action)) {
      setPendingAction(action);
    } else {
      emitAction(action, undefined, undefined);
    }
  }, [selectedLineupId, activeTeam]);

  function emitAction(action: string, courtX?: number, courtY?: number) {
    if (!socketRef.current || !selectedLineupId || !activeTeam) return;
    socketRef.current.emit('action:log', {
      sessionId:  params.sessionId,
      lineupId:   selectedLineupId,
      team:       activeTeam,
      actionType: action,
      ...(courtX !== undefined && courtY !== undefined ? { courtX, courtY } : {}),
    });
  }

  function handleShotPlace(x: number, y: number) {
    if (!pendingAction) return;
    emitAction(pendingAction, x, y);
    setPendingAction(null);
  }

  function handleShotCancel() {
    if (!pendingAction) return;
    emitAction(pendingAction);
    setPendingAction(null);
  }

  const handleUndo = useCallback(() => {
    socketRef.current?.emit('action:undo', { sessionId: params.sessionId });
  }, [params.sessionId]);

  const handleTimeout = useCallback((team: 'home' | 'away') => {
    socketRef.current?.emit('timeout:call', { sessionId: params.sessionId, team });
    setGameState(prev => prev ? {
      ...prev,
      homeTimeouts: team === 'home' ? Math.max(0, prev.homeTimeouts - 1) : prev.homeTimeouts,
      awayTimeouts: team === 'away' ? Math.max(0, prev.awayTimeouts - 1) : prev.awayTimeouts,
    } : prev);
  }, [params.sessionId]);

  const handleNextPeriod = useCallback(() => {
    if (!gameState) return;
    if (!confirm(`¿Finalizar período ${gameState.period}?`)) return;
    socketRef.current?.emit('period:advance', { sessionId: params.sessionId });
  }, [params.sessionId, gameState]);

  const handleFinishMatch = useCallback(() => {
    if (!confirm('¿Finalizar el partido?')) return;
    socketRef.current?.emit('match:finish', { sessionId: params.sessionId });
  }, [params.sessionId]);

  // ── Loading / Error states ──────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="text-red-400 text-sm">{error}</div>
        <button
          onClick={() => router.refresh()}
          className="px-4 py-2 bg-[#F97316] text-white text-sm rounded-lg"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <div className="w-8 h-8 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" />
        <div className="text-xs text-[#7A8098]">
          {connected ? 'Cargando estado del partido...' : 'Conectando...'}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Flash */}
      {flash && <FlashMessage message={flash.message} type={flash.type} />}

      {/* Shot modal */}
      {pendingAction && (
        <ShotModal
          action={pendingAction}
          onPlace={handleShotPlace}
          onCancel={handleShotCancel}
        />
      )}

      {/* Nav tabs */}
      <NavTabs sessionId={params.sessionId} active="live" />

      {/* Connection indicator */}
      <div className={cn(
        'h-0.5 w-full transition-colors',
        connected ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'
      )} />

      {/* Scoreboard */}
      <ScoreBoard
        homeScore={gameState.homeScore}
        awayScore={gameState.awayScore}
        homeName={gameState.home.teamName}
        awayName={gameState.away.teamName}
        period={gameState.period}
        clockSeconds={clockSeconds}
        periodScores={gameState.periodScores}
        homeTimeouts={gameState.homeTimeouts}
        awayTimeouts={gameState.awayTimeouts}
        isRunning={isRunning}
        onClockToggle={handleClockToggle}
        onClockEdit={handleClockEdit}
        onUndo={handleUndo}
        onTimeout={handleTimeout}
        onNextPeriod={handleNextPeriod}
        onFinishMatch={handleFinishMatch}
        canControl={canControl}
        status={gameState.status}
        sessionStatus={gameState.status}
      />

      {/* Main content: team panels + play-by-play */}
      <div className="flex flex-1 overflow-hidden">
        {/* Home team */}
        <TeamPanel
          lineup={gameState.home}
          selectedId={selectedLineupId}
          activeTeam={activeTeam}
          side="home"
          onSelectPlayer={handleSelectPlayer}
          onSelectTeam={handleSelectTeam}
        />

        {/* Away team */}
        <TeamPanel
          lineup={gameState.away}
          selectedId={selectedLineupId}
          activeTeam={activeTeam}
          side="away"
          onSelectPlayer={handleSelectPlayer}
          onSelectTeam={handleSelectTeam}
        />

        {/* Play-by-play log */}
        <div className="w-40 flex-shrink-0 hidden md:flex flex-col overflow-hidden">
          <PlayByPlayLog
            plays={gameState.plays}
            homeColor={gameState.home.color}
            awayColor={gameState.away.color}
          />
        </div>
      </div>

      {/* Action panel */}
      {canControl && (
        <ActionPanel
          selectedPlayer={selectedPlayer}
          onAction={handleAction}
        />
      )}

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#181C25] border-t border-white/10 text-[10px] text-[#7A8098]">
        <span>{connected ? '⬤ Conectado' : '⬤ Desconectado'}</span>
        <span>{gameState.status === 'FINISHED' ? 'Partido finalizado' : `Período ${gameState.period}`}</span>
        <Link href={`/stats/${params.sessionId}/boxscore`} className="hover:text-white transition">
          Ver box score →
        </Link>
      </div>
    </div>
  );
}
