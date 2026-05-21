'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Shot {
  id: string;
  x: number;
  y: number;
  made: boolean;
  actionType: string;
  playerName?: string;
  period: number;
  team: 'home' | 'away';
}

interface ZoneStats {
  zone: string;
  label: string;
  attempts: number;
  made: number;
  pct: number;
}

interface ShotChartData {
  session: {
    id: string;
    status: string;
    home: { teamName: string; score: number };
    away: { teamName: string; score: number };
  };
  shots: Shot[];
  zones?: ZoneStats[];
}

function NavTabs({ sessionId, active, status }: { sessionId: string; active: string; status?: string }) {
  const tabs = [
    ...(status !== 'FINISHED' ? [{ key: 'live', label: '⬤ Live', href: `/stats/${sessionId}/live` }] : []),
    { key: 'boxscore',  label: 'Box Score',   href: `/stats/${sessionId}/boxscore` },
    { key: 'analysis',  label: 'Análisis IA', href: `/stats/${sessionId}/analysis` },
    { key: 'shotchart', label: 'Shot Chart',  href: `/stats/${sessionId}/shotchart` },
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

function ShotDot({ shot, scale }: { shot: Shot; scale: number }) {
  const is3 = shot.actionType.startsWith('FG3');
  const r   = is3 ? 5 : 4;
  const cx  = (shot.x / 100) * scale;
  const cy  = (shot.y / 100) * scale;

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={shot.made ? '#22C55E' : '#EF4444'}
        fillOpacity={0.8}
        stroke={shot.made ? '#16A34A' : '#DC2626'}
        strokeWidth={1}
      />
      {is3 && (
        <circle
          cx={cx}
          cy={cy}
          r={r + 2}
          fill="none"
          stroke={shot.made ? '#22C55E' : '#EF4444'}
          strokeWidth={0.8}
          strokeOpacity={0.5}
        />
      )}
    </g>
  );
}

function CourtSVG({ shots, filter, scale = 400 }: { shots: Shot[]; filter: 'all' | 'home' | 'away'; scale?: number }) {
  const filtered = filter === 'all' ? shots : shots.filter(s => s.team === filter);

  return (
    <svg
      viewBox={`0 0 ${scale} ${scale}`}
      className="w-full max-w-lg mx-auto rounded-2xl border border-white/10"
      style={{ background: '#1a2e4a' }}
    >
      {/* Court outline */}
      <rect x="20" y="20" width={scale - 40} height={scale - 40} fill="none" stroke="#334466" strokeWidth="3" />

      {/* Paint area (top half court only) */}
      <rect
        x={scale * 0.3}
        y={20}
        width={scale * 0.4}
        height={scale * 0.3}
        fill="rgba(51,68,100,0.3)"
        stroke="#445566"
        strokeWidth="2"
      />

      {/* Free throw circle */}
      <circle cx={scale / 2} cy={scale * 0.35} r={scale * 0.125} fill="none" stroke="#445566" strokeWidth="2" />

      {/* Basket */}
      <circle cx={scale / 2} cy={scale * 0.11} r={scale * 0.03} fill="none" stroke="#F97316" strokeWidth="2.5" />
      <line
        x1={scale * 0.47} y1={scale * 0.11}
        x2={scale * 0.53} y2={scale * 0.11}
        stroke="#F97316" strokeWidth="1.5"
      />

      {/* Backboard */}
      <line
        x1={scale * 0.4} y1={scale * 0.085}
        x2={scale * 0.6} y2={scale * 0.085}
        stroke="#F97316" strokeWidth="2"
      />

      {/* Three-point arc */}
      <path
        d={`M ${scale * 0.15} 20 Q ${scale * 0.15} ${scale * 0.65} ${scale / 2} ${scale * 0.67} Q ${scale * 0.85} ${scale * 0.65} ${scale * 0.85} 20`}
        fill="none"
        stroke="#38BDF8"
        strokeWidth="2"
        strokeDasharray="6 3"
      />
      {/* Corner three lines */}
      <line
        x1={scale * 0.15} y1={20}
        x2={scale * 0.15} y2={scale * 0.28}
        stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="6 3"
      />
      <line
        x1={scale * 0.85} y1={20}
        x2={scale * 0.85} y2={scale * 0.28}
        stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="6 3"
      />

      {/* Mid-court line */}
      <line x1={20} y1={scale / 2} x2={scale - 20} y2={scale / 2} stroke="#334466" strokeWidth="1.5" />
      <circle cx={scale / 2} cy={scale / 2} r={scale * 0.1} fill="none" stroke="#334466" strokeWidth="1.5" />

      {/* Shot dots */}
      {filtered.map(shot => (
        <ShotDot key={shot.id} shot={shot} scale={scale} />
      ))}
    </svg>
  );
}

export default function ShotChartPage() {
  const params = useParams<{ sessionId: string }>();
  const [data, setData]       = useState<ShotChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [filter, setFilter]   = useState<'all' | 'home' | 'away'>('all');

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get(`/stats/sessions/${params.sessionId}/shotchart`);
      setData(res.data.data ?? res.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message ?? 'Error al cargar el shot chart');
    } finally {
      setLoading(false);
    }
  }, [params.sessionId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const shotsMade   = data?.shots.filter(s => s.made).length ?? 0;
  const shotsTotal  = data?.shots.length ?? 0;
  const shots3Made  = data?.shots.filter(s => s.made && s.actionType.startsWith('FG3')).length ?? 0;
  const shots3Total = data?.shots.filter(s => s.actionType.startsWith('FG3')).length ?? 0;
  const shots2Made  = data?.shots.filter(s => s.made && s.actionType.startsWith('FG2')).length ?? 0;
  const shots2Total = data?.shots.filter(s => s.actionType.startsWith('FG2')).length ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-red-400 text-sm">{error ?? 'No se pudo cargar el shot chart'}</p>
        <button onClick={fetchData} className="px-4 py-2 bg-[#F97316] text-white text-sm rounded-lg">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <NavTabs sessionId={params.sessionId} active="shotchart" status={data.session?.status} />

      <div className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white">Shot Chart</h1>
          <button
            onClick={fetchData}
            className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-[#7A8098] hover:text-white rounded-lg transition"
          >
            ↻
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-4">
          {(['all', 'home', 'away'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition',
                filter === f
                  ? 'bg-white/20 text-white'
                  : 'text-[#7A8098] hover:bg-white/10 hover:text-white'
              )}
            >
              {f === 'all'  ? 'Todos' :
               f === 'home' ? data.session.home.teamName :
                              data.session.away.teamName}
            </button>
          ))}
        </div>

        {/* Court */}
        {data.shots.length === 0 ? (
          <div className="bg-[#181C25] rounded-2xl border border-white/10 p-12 text-center">
            <p className="text-[#7A8098] text-sm">Sin tiros registrados</p>
            <p className="text-xs text-[#7A8098] mt-1">Los tiros aparecerán aquí cuando se registren en el partido</p>
          </div>
        ) : (
          <CourtSVG shots={data.shots} filter={filter} />
        )}

        {/* Legend */}
        <div className="flex gap-4 justify-center mt-3 text-xs text-[#7A8098]">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            Anotado
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            Fallado
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full border border-[#7A8098]" />
            3 pts
          </div>
        </div>

        {/* Stats summary */}
        {shotsTotal > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-[#181C25] rounded-xl border border-white/10 p-3 text-center">
              <div className="text-lg font-bold text-white">{shotsTotal > 0 ? Math.round((shotsMade / shotsTotal) * 100) : 0}%</div>
              <div className="text-xs text-[#7A8098] mt-0.5">FG Total</div>
              <div className="text-[10px] text-[#7A8098]">{shotsMade}/{shotsTotal}</div>
            </div>
            <div className="bg-[#181C25] rounded-xl border border-white/10 p-3 text-center">
              <div className="text-lg font-bold text-white">{shots2Total > 0 ? Math.round((shots2Made / shots2Total) * 100) : 0}%</div>
              <div className="text-xs text-[#7A8098] mt-0.5">2FG</div>
              <div className="text-[10px] text-[#7A8098]">{shots2Made}/{shots2Total}</div>
            </div>
            <div className="bg-[#181C25] rounded-xl border border-white/10 p-3 text-center">
              <div className="text-lg font-bold text-white">{shots3Total > 0 ? Math.round((shots3Made / shots3Total) * 100) : 0}%</div>
              <div className="text-xs text-[#7A8098] mt-0.5">3FG</div>
              <div className="text-[10px] text-[#7A8098]">{shots3Made}/{shots3Total}</div>
            </div>
          </div>
        )}

        {/* Zone breakdown if available */}
        {data.zones && data.zones.length > 0 && (
          <div className="mt-4 bg-[#181C25] rounded-2xl border border-white/10 p-4">
            <div className="text-xs font-semibold text-[#7A8098] uppercase tracking-wider mb-3">
              Eficiencia por zona
            </div>
            <div className="space-y-2">
              {data.zones.map(z => (
                <div key={z.zone} className="flex items-center gap-3">
                  <span className="text-xs text-white/70 w-24 flex-shrink-0">{z.label}</span>
                  <div className="flex-1 bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        z.pct >= 50 ? 'bg-emerald-500' : z.pct >= 33 ? 'bg-yellow-500' : 'bg-red-500'
                      )}
                      style={{ width: `${z.pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-[#7A8098] w-20 text-right flex-shrink-0">
                    {z.pct}% ({z.made}/{z.attempts})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
