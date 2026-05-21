'use client';

interface MatchStat {
  matchId: string;
  matchDate: string;
  opponent: string;
  points: number;
  rebounds: number;
  assists: number;
  minutes: number;
}

export function PerformanceSparklines({ stats }: { stats: MatchStat[] }) {
  if (stats.length === 0) {
    return (
      <div className="rounded-xl border border-white/8 bg-[#181C25] px-4 py-4 text-center text-white/30 text-sm">
        Sin estadísticas registradas aún
      </div>
    );
  }

  const reversed = [...stats].reverse();
  const maxPts = Math.max(...reversed.map((s) => s.points), 1);

  return (
    <div className="rounded-xl border border-white/8 bg-[#181C25] px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-white">Rendimiento — últimos partidos</span>
        <span className="text-[10px] text-white/30">puntos</span>
      </div>

      <div className="flex items-end gap-1.5 h-14">
        {reversed.map((stat, i) => {
          const pct = (stat.points / maxPts) * 100;
          const isTop = stat.points === maxPts;
          const isLast = i === reversed.length - 1;
          return (
            <div key={stat.matchId} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full relative group cursor-pointer">
                <div
                  className="w-full rounded-sm transition-opacity hover:opacity-75"
                  style={{
                    height: `${Math.max(pct * 0.56, 4)}px`,
                    background: isTop ? '#F97316' : isLast ? '#1D9E75' : '#534AB7',
                  }}
                />
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#252A3A] text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {stat.points} pts vs {stat.opponent}
                </div>
              </div>
              <span className="text-[9px] text-white/30">PJ{i + 1}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
