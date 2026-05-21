'use client';
import { cn } from '@/lib/utils';
import type { LineupPlayer } from './PlayerGrid';

const ACTIONS = [
  { key: 'FG2_MADE',       label: '2 pts ✓',    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',  group: 'Canasta' },
  { key: 'FG2_MISSED',     label: '2 pts ✗',    color: 'bg-red-500/20 text-red-400 border-red-500/30',              group: 'Canasta' },
  { key: 'FG3_MADE',       label: '3 pts ✓',    color: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30',  group: 'Canasta' },
  { key: 'FG3_MISSED',     label: '3 pts ✗',    color: 'bg-red-400/20 text-red-300 border-red-400/30',              group: 'Canasta' },
  { key: 'FT_MADE',        label: 'TL ✓',       color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',           group: 'Tiro libre' },
  { key: 'FT_MISSED',      label: 'TL ✗',       color: 'bg-blue-400/20 text-blue-300 border-blue-400/30',           group: 'Tiro libre' },
  { key: 'OFF_REBOUND',    label: 'Reb.Of.',     color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',    group: 'Rebotes' },
  { key: 'DEF_REBOUND',    label: 'Reb.Def.',    color: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/30',    group: 'Rebotes' },
  { key: 'ASSIST',         label: 'Asist.',      color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',    group: 'Acc.' },
  { key: 'STEAL',          label: 'Robo',        color: 'bg-purple-400/20 text-purple-300 border-purple-400/30',    group: 'Acc.' },
  { key: 'BLOCK',          label: 'Tapón',       color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',    group: 'Acc.' },
  { key: 'TURNOVER',       label: 'Pérdida',     color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',    group: 'Neg.' },
  { key: 'PERSONAL_FOUL',  label: 'Falta P.',    color: 'bg-red-600/20 text-red-500 border-red-600/30',             group: 'Faltas' },
  { key: 'DRAW_FOUL',      label: 'Rec. falta',  color: 'bg-teal-500/20 text-teal-400 border-teal-500/30',          group: 'Faltas' },
  { key: 'TECHNICAL_FOUL', label: 'Falta T.',    color: 'bg-red-700/20 text-red-600 border-red-700/30',             group: 'Faltas' },
];

interface Props {
  selectedPlayer: LineupPlayer | null | undefined;
  onAction: (action: string) => void;
}

export function ActionPanel({ selectedPlayer, onAction }: Props) {
  if (!selectedPlayer) {
    return (
      <div className="h-40 flex items-center justify-center text-[#7A8098] text-sm border-t border-white/10">
        Seleccioná un jugador para registrar acciones
      </div>
    );
  }

  return (
    <div className="border-t border-white/10 p-3">
      <div className="text-xs text-[#7A8098] mb-2">
        → <span className="text-white font-medium">{selectedPlayer.name}</span>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {ACTIONS.map(a => (
          <button
            key={a.key}
            onClick={() => onAction(a.key)}
            className={cn(
              'px-1.5 py-2 text-xs font-medium rounded-lg border transition-all active:scale-95',
              a.color
            )}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
