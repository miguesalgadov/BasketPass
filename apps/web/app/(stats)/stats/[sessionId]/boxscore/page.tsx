'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { BoxScore, type BoxScoreLine } from '@/components/stats/BoxScore';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface BoxScoreData {
  session: {
    id: string;
    status: string;
    period: number;
    home: { participantId: string; teamName: string; score: number };
    away: { participantId: string; teamName: string; score: number };
  };
  home: BoxScoreLine[];
  away: BoxScoreLine[];
}

function NavTabs({ sessionId, active, status }: { sessionId: string; active: string; status: string }) {
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

function ScoreHeader({ data }: { data: BoxScoreData }) {
  const { session } = data;
  return (
    <div className="bg-[#181C25] px-6 py-5 border-b border-white/10">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <div className="text-center flex-1">
          <div className="text-xs text-[#7A8098] uppercase tracking-wider">{session.home.teamName}</div>
          <div className="text-5xl font-black text-white mt-1">{session.home.score}</div>
        </div>
        <div className="text-center flex-shrink-0">
          <div className={cn(
            'inline-block px-2 py-0.5 text-xs font-semibold rounded-full mb-1',
            session.status === 'FINISHED' ? 'bg-[#F97316]/20 text-[#F97316]' :
            session.status === 'LIVE'     ? 'bg-emerald-500/20 text-emerald-400' :
                                            'bg-white/10 text-[#7A8098]'
          )}>
            {session.status === 'FINISHED' ? 'Final' :
             session.status === 'LIVE'     ? `Q${session.period}` :
             session.status}
          </div>
          <div className="text-sm text-[#7A8098]">vs</div>
        </div>
        <div className="text-center flex-1">
          <div className="text-xs text-[#7A8098] uppercase tracking-wider">{session.away.teamName}</div>
          <div className="text-5xl font-black text-white mt-1">{session.away.score}</div>
        </div>
      </div>
    </div>
  );
}

export default function BoxScorePage() {
  const params = useParams<{ sessionId: string }>();
  const [data, setData] = useState<BoxScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get(`/stats/sessions/${params.sessionId}/boxscore`);
      setData(res.data.data ?? res.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message ?? 'Error al cargar el box score');
    } finally {
      setLoading(false);
    }
  }, [params.sessionId]);

  useEffect(() => {
    fetchData();
    // Auto-refresh for live games
    const interval = setInterval(() => {
      if (data?.session.status === 'LIVE') fetchData();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchData, data?.session.status]);

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
        <p className="text-red-400 text-sm">{error ?? 'No se pudo cargar el box score'}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-[#F97316] text-white text-sm rounded-lg hover:bg-orange-600 transition"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <NavTabs sessionId={params.sessionId} active="boxscore" status={data.session.status} />
      <ScoreHeader data={data} />

      <div className="flex-1 p-4 space-y-6">
        {/* Refresh button for live */}
        {data.session.status === 'LIVE' && (
          <div className="flex justify-end">
            <button
              onClick={fetchData}
              className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-[#7A8098] hover:text-white rounded-lg transition"
            >
              ↻ Actualizar
            </button>
          </div>
        )}

        {/* Home team box score */}
        <div className="bg-[#181C25] rounded-2xl border border-white/10 p-4">
          <BoxScore
            rows={data.home}
            teamName={data.session.home.teamName}
            score={data.session.home.score}
          />
        </div>

        {/* Away team box score */}
        <div className="bg-[#181C25] rounded-2xl border border-white/10 p-4">
          <BoxScore
            rows={data.away}
            teamName={data.session.away.teamName}
            score={data.session.away.score}
          />
        </div>

        {/* Links to other views */}
        <div className="flex gap-3 justify-center pb-6">
          <Link
            href={`/stats/${params.sessionId}/analysis`}
            className="px-4 py-2 bg-[#F97316]/20 text-[#F97316] border border-[#F97316]/30 text-sm font-medium rounded-xl hover:bg-[#F97316]/30 transition"
          >
            ✦ Ver Análisis IA
          </Link>
          <Link
            href={`/stats/${params.sessionId}/shotchart`}
            className="px-4 py-2 bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/30 text-sm font-medium rounded-xl hover:bg-[#38BDF8]/30 transition"
          >
            Shot Chart
          </Link>
        </div>
      </div>
    </div>
  );
}
