'use client';
import { cn } from '@/lib/utils';

export interface LineupPlayer {
  id: string;
  name: string;
  number?: number;
  position?: string;
  isOnCourt: boolean;
  isStarter: boolean;
  stats?: {
    points: number; pir: number; personalFouls: number;
    fg2Made: number; fg2Attempted: number;
    fg3Made: number; fg3Attempted: number;
    assists: number; steals: number; blocks: number;
    turnovers: number;
  } | null;
}

interface Props {
  players: LineupPlayer[];
  selectedId: string | null;
  teamColor: string;
  onSelect: (id: string) => void;
}

export function PlayerGrid({ players, selectedId, teamColor, onSelect }: Props) {
  if (!players || players.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#7A8098] text-sm p-4">
        Sin jugadores. Configure la alineación primero.
      </div>
    );
  }

  const starters = players.filter(p => p.isStarter || p.isOnCourt);
  const bench    = players.filter(p => !p.isStarter && !p.isOnCourt);

  const renderPlayer = (p: LineupPlayer) => {
    const isSelected = selectedId === p.id;
    const fouls = p.stats?.personalFouls ?? 0;
    return (
      <button
        key={p.id}
        onClick={() => onSelect(p.id)}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all w-full',
          isSelected
            ? 'border-[var(--tc)] bg-[var(--tc)]/15 shadow-lg'
            : 'border-white/10 bg-white/5 hover:bg-white/10',
          fouls >= 5 && 'opacity-50'
        )}
        style={{ '--tc': teamColor } as React.CSSProperties}
      >
        {/* Jersey number */}
        <div
          className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0',
            isSelected ? 'text-white' : 'bg-white/10 text-white/70'
          )}
          style={isSelected ? { backgroundColor: teamColor } : undefined}
        >
          {p.number ?? '?'}
        </div>
        {/* Name + pos */}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-white truncate">{p.name.split(' ').slice(-1)[0]}</div>
          <div className="text-[10px] text-[#7A8098]">{p.position ?? ''} {fouls > 0 ? `· ${fouls}f` : ''}</div>
        </div>
        {/* Mini stats */}
        {p.stats && (
          <div className="text-right flex-shrink-0">
            <div className="text-sm font-bold text-white">{p.stats.points}</div>
            <div className="text-[10px] text-[#7A8098]">PIR {p.stats.pir}</div>
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {starters.length > 0 && (
        <div>
          <div className="text-[10px] text-[#7A8098] uppercase tracking-widest mb-1.5 px-1">En cancha</div>
          <div className="grid grid-cols-2 gap-1.5">{starters.map(renderPlayer)}</div>
        </div>
      )}
      {bench.length > 0 && (
        <div>
          <div className="text-[10px] text-[#7A8098] uppercase tracking-widest mb-1.5 px-1">Banquillo</div>
          <div className="grid grid-cols-2 gap-1.5">{bench.map(renderPlayer)}</div>
        </div>
      )}
    </div>
  );
}
