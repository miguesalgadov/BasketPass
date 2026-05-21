'use client';

interface SeasonStats {
  matchesPlayed: number;
  wins: number;
  losses: number;
  attendanceRate: number;
  callups: number;
}

export function SeasonSummaryBar({ stats }: { stats: SeasonStats }) {
  const year = new Date().getFullYear();
  const kpis = [
    { val: stats.matchesPlayed, label: 'Partidos',  color: 'text-white' },
    { val: stats.wins,          label: 'Ganados',   color: 'text-green-400' },
    { val: stats.losses,        label: 'Perdidos',  color: 'text-red-400' },
    { val: `${stats.attendanceRate}%`, label: 'Asistencia', color: 'text-orange-400' },
    { val: stats.callups,       label: 'Convoc.',   color: 'text-white' },
  ];

  return (
    <div className="rounded-xl border border-white/8 bg-[#181C25] px-4 py-3">
      <p className="text-[10px] text-white/30 uppercase tracking-wider mb-3">
        Temporada {year} — resumen
      </p>
      <div className="grid grid-cols-5 divide-x divide-white/8">
        {kpis.map((k, i) => (
          <div key={i} className="text-center px-2">
            <div className={`text-2xl font-black leading-none ${k.color}`}>{k.val}</div>
            <div className="text-[9px] text-white/40 uppercase tracking-wider mt-1">{k.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
