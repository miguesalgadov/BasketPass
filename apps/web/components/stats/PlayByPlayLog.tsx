'use client';
import { cn } from '@/lib/utils';

export interface Play {
  id: string;
  period: number;
  clockSeconds: number;
  team: 'home' | 'away';
  actionType: string;
  points: number;
  homeScore: number;
  awayScore: number;
  playerName?: string;
}

const ACTION_LABELS: Record<string, string> = {
  FG2_MADE: '2pts ✓', FG2_MISSED: '2pts ✗', FG3_MADE: '3pts ✓', FG3_MISSED: '3pts ✗',
  FT_MADE: 'TL ✓', FT_MISSED: 'TL ✗', OFF_REBOUND: 'Reb.Of.', DEF_REBOUND: 'Reb.Def.',
  ASSIST: 'Asist.', STEAL: 'Robo', BLOCK: 'Tapón', TURNOVER: 'Pérdida',
  PERSONAL_FOUL: 'Falta P.', DRAW_FOUL: 'Falta rec.', TECHNICAL_FOUL: 'Falta T.',
};

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

export function PlayByPlayLog({ plays, homeColor, awayColor }: {
  plays: Play[]; homeColor: string; awayColor: string;
}) {
  return (
    <div className="border-l border-white/10 bg-[#0F1117] overflow-y-auto p-2 flex flex-col gap-1">
      <div className="text-[10px] text-[#7A8098] uppercase tracking-widest px-1 mb-1">Acciones</div>
      {plays.length === 0 && (
        <div className="text-xs text-[#7A8098] text-center py-4">Sin acciones aún</div>
      )}
      {[...plays].reverse().map(p => (
        <div
          key={p.id}
          className={cn(
            'text-[11px] px-2 py-1.5 rounded-lg flex flex-col gap-0.5',
            p.team === 'home'
              ? 'bg-white/5 border-l-2'
              : 'bg-white/[0.03] border-r-2 text-right',
          )}
          style={{ borderColor: p.team === 'home' ? homeColor : awayColor }}
        >
          <div className="font-medium text-white">
            {p.playerName && <span className="text-[#7A8098] mr-1">{p.playerName.split(' ').slice(-1)[0]}</span>}
            {ACTION_LABELS[p.actionType] ?? p.actionType}
          </div>
          <div className="text-[#7A8098]">
            Q{p.period} {fmt(p.clockSeconds)} · {p.homeScore}-{p.awayScore}
          </div>
        </div>
      ))}
    </div>
  );
}
