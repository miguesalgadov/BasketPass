'use client';
import { cn } from '@/lib/utils';

export interface BoxScoreLine {
  lineupId: string;
  participantId: string;
  name: string;
  number?: number;
  position?: string;
  didNotPlay: boolean;
  min: number;
  pts: number; fg2: string; fg3: string; ft: string;
  fg2Pct: number | null; fg3Pct: number | null; ftPct: number | null;
  or: number; dr: number; reb: number;
  ast: number; stl: number; blk: number; to: number; pf: number;
  pir: number; plusMinus: number;
}

interface Props {
  rows: BoxScoreLine[];
  teamName: string;
  score: number;
}

export function BoxScore({ rows, teamName, score }: Props) {
  const active = rows.filter(r => !r.didNotPlay);
  const dnp    = rows.filter(r =>  r.didNotPlay);

  const totals = active.reduce((acc, r) => ({
    min: acc.min + r.min,
    pts: acc.pts + r.pts,
    reb: acc.reb + r.reb,
    ast: acc.ast + r.ast,
    stl: acc.stl + r.stl,
    blk: acc.blk + r.blk,
    to:  acc.to  + r.to,
    pf:  acc.pf  + r.pf,
    pir: acc.pir + r.pir,
  }), { min: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, to: 0, pf: 0, pir: 0 });

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-sm font-semibold text-white">{teamName}</span>
        <span className="text-2xl font-black text-white">{score}</span>
      </div>
      <table className="w-full text-xs min-w-[700px]">
        <thead>
          <tr className="text-[#7A8098] uppercase tracking-wider border-b border-white/10">
            <th className="py-2 text-left px-2 w-8">#</th>
            <th className="py-2 text-left px-2">Jugador</th>
            <th className="py-2 text-center px-1.5">Min</th>
            <th className="py-2 text-center px-1.5">PTS</th>
            <th className="py-2 text-center px-1.5">2FG</th>
            <th className="py-2 text-center px-1.5">3FG</th>
            <th className="py-2 text-center px-1.5">TL</th>
            <th className="py-2 text-center px-1.5">RO</th>
            <th className="py-2 text-center px-1.5">RD</th>
            <th className="py-2 text-center px-1.5">REB</th>
            <th className="py-2 text-center px-1.5">AST</th>
            <th className="py-2 text-center px-1.5">ROB</th>
            <th className="py-2 text-center px-1.5">TAP</th>
            <th className="py-2 text-center px-1.5">PER</th>
            <th className="py-2 text-center px-1.5">FP</th>
            <th className="py-2 text-center px-1.5 font-bold text-white">PIR</th>
            <th className="py-2 text-center px-1.5">+/-</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {active.map(r => (
            <tr key={r.lineupId} className="hover:bg-white/5 transition-colors">
              <td className="py-2 px-2 text-[#7A8098]">{r.number ?? '-'}</td>
              <td className="py-2 px-2 text-white font-medium">
                {r.name}
                {r.position && <span className="text-[#7A8098] ml-1 text-[10px]">{r.position}</span>}
              </td>
              <td className="py-2 px-1.5 text-center text-[#7A8098]">{r.min}</td>
              <td className="py-2 px-1.5 text-center font-bold text-white">{r.pts}</td>
              <td className="py-2 px-1.5 text-center text-[#7A8098]">
                {r.fg2}
                {r.fg2Pct !== null && <span className="text-[10px] ml-0.5">({r.fg2Pct}%)</span>}
              </td>
              <td className="py-2 px-1.5 text-center text-[#7A8098]">
                {r.fg3}
                {r.fg3Pct !== null && <span className="text-[10px] ml-0.5">({r.fg3Pct}%)</span>}
              </td>
              <td className="py-2 px-1.5 text-center text-[#7A8098]">
                {r.ft}
                {r.ftPct !== null && <span className="text-[10px] ml-0.5">({r.ftPct}%)</span>}
              </td>
              <td className="py-2 px-1.5 text-center text-[#7A8098]">{r.or}</td>
              <td className="py-2 px-1.5 text-center text-[#7A8098]">{r.dr}</td>
              <td className="py-2 px-1.5 text-center text-[#7A8098]">{r.reb}</td>
              <td className="py-2 px-1.5 text-center text-[#7A8098]">{r.ast}</td>
              <td className="py-2 px-1.5 text-center text-[#7A8098]">{r.stl}</td>
              <td className="py-2 px-1.5 text-center text-[#7A8098]">{r.blk}</td>
              <td className="py-2 px-1.5 text-center text-[#7A8098]">{r.to}</td>
              <td className="py-2 px-1.5 text-center text-[#7A8098]">{r.pf}</td>
              <td className={cn(
                'py-2 px-1.5 text-center font-bold',
                r.pir >= 0 ? 'text-emerald-400' : 'text-red-400'
              )}>
                {r.pir}
              </td>
              <td className={cn(
                'py-2 px-1.5 text-center',
                r.plusMinus > 0 ? 'text-emerald-400' : r.plusMinus < 0 ? 'text-red-400' : 'text-[#7A8098]'
              )}>
                {r.plusMinus > 0 ? `+${r.plusMinus}` : r.plusMinus}
              </td>
            </tr>
          ))}
          {/* Totals row */}
          <tr className="border-t border-white/20 font-semibold text-white">
            <td colSpan={2} className="py-2 px-2">TOTALES</td>
            <td className="py-2 px-1.5 text-center">{totals.min}</td>
            <td className="py-2 px-1.5 text-center">{totals.pts}</td>
            <td colSpan={3} />
            <td colSpan={2} />
            <td className="py-2 px-1.5 text-center">{totals.reb}</td>
            <td className="py-2 px-1.5 text-center">{totals.ast}</td>
            <td className="py-2 px-1.5 text-center">{totals.stl}</td>
            <td className="py-2 px-1.5 text-center">{totals.blk}</td>
            <td className="py-2 px-1.5 text-center">{totals.to}</td>
            <td className="py-2 px-1.5 text-center">{totals.pf}</td>
            <td className="py-2 px-1.5 text-center">{totals.pir}</td>
            <td />
          </tr>
        </tbody>
      </table>
      {dnp.length > 0 && (
        <div className="mt-2 text-xs text-[#7A8098] px-2">
          DNP: {dnp.map(r => r.name).join(', ')}
        </div>
      )}
    </div>
  );
}
