'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface KeyMoment {
  period: number;
  clockSeconds: number;
  description: string;
}

interface TeamAnalysis {
  teamName: string;
  strengths: string[];
  weaknesses: string[];
}

interface AnalysisData {
  sessionId: string;
  analysisGenerated: boolean;
  generatedAt?: string;
  recap?: string;
  mvp?: { name: string; justification: string };
  keyMoments?: KeyMoment[];
  homeAnalysis?: TeamAnalysis;
  awayAnalysis?: TeamAnalysis;
  tacticalConclusion?: string;
  session?: {
    status: string;
    home: { teamName: string; score: number };
    away: { teamName: string; score: number };
  };
}

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
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

export default function AnalysisPage() {
  const params = useParams<{ sessionId: string }>();
  const [data, setData]       = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get(`/stats/sessions/${params.sessionId}/analysis`);
      const d: AnalysisData = res.data.data ?? res.data;
      setData(d);
      if (d.analysisGenerated && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message ?? 'Error al cargar el análisis');
    } finally {
      setLoading(false);
    }
  }, [params.sessionId]);

  useEffect(() => {
    fetchData();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchData]);

  // Poll if not yet generated
  useEffect(() => {
    if (!data) return;
    if (!data.analysisGenerated && !pollRef.current) {
      pollRef.current = setInterval(fetchData, 5000);
    }
    return () => {
      if (pollRef.current && data.analysisGenerated) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [data, fetchData]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      await api.post(`/stats/sessions/${params.sessionId}/analysis`);
      // Start polling
      if (!pollRef.current) {
        pollRef.current = setInterval(fetchData, 5000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message ?? 'Error al generar el análisis');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-[#F97316] text-white text-sm rounded-lg"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <NavTabs sessionId={params.sessionId} active="analysis" status={data?.session?.status} />

      <div className="flex-1 p-4 max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Análisis del partido</h1>
            {data?.session && (
              <p className="text-sm text-[#7A8098] mt-0.5">
                {data.session.home.teamName} {data.session.home.score} – {data.session.away.score} {data.session.away.teamName}
              </p>
            )}
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F97316]/10 text-[#F97316] border border-[#F97316]/20 text-xs font-semibold rounded-full">
            ✦ Análisis IA
          </span>
        </div>

        {!data?.analysisGenerated ? (
          // Not generated yet
          <div className="bg-[#181C25] rounded-2xl border border-white/10 p-8 text-center">
            {generating || (data && !data.analysisGenerated && pollRef.current) ? (
              <>
                <div className="w-10 h-10 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-white font-medium">Generando análisis con IA...</p>
                <p className="text-xs text-[#7A8098] mt-1">Esto puede tardar unos segundos</p>
              </>
            ) : (
              <>
                <div className="text-4xl mb-4">✦</div>
                <p className="text-white font-medium mb-1">Análisis IA no generado</p>
                <p className="text-xs text-[#7A8098] mb-6">
                  El análisis se genera automáticamente al finalizar el partido, o podés generarlo ahora.
                </p>
                <button
                  onClick={handleGenerate}
                  className="px-5 py-2.5 bg-[#F97316] hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition"
                >
                  Generar análisis ahora
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Recap */}
            {data?.recap && (
              <div className="bg-[#181C25] rounded-2xl border border-white/10 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[#F97316] text-sm">✦</span>
                  <span className="text-xs font-semibold text-[#F97316] uppercase tracking-wider">Resumen</span>
                </div>
                <p className="text-sm text-white/90 leading-relaxed">{data.recap}</p>
                {data.generatedAt && (
                  <p className="text-[10px] text-[#7A8098] mt-3">
                    Generado el {new Date(data.generatedAt).toLocaleString('es-AR')}
                  </p>
                )}
              </div>
            )}

            {/* MVP */}
            {data?.mvp && (
              <div className="bg-gradient-to-br from-[#F97316]/10 to-[#181C25] rounded-2xl border border-[#F97316]/20 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🏆</span>
                  <span className="text-xs font-semibold text-[#F97316] uppercase tracking-wider">MVP del partido</span>
                </div>
                <p className="text-lg font-bold text-white">{data.mvp.name}</p>
                <p className="text-sm text-white/70 mt-1">{data.mvp.justification}</p>
              </div>
            )}

            {/* Key moments */}
            {data?.keyMoments && data.keyMoments.length > 0 && (
              <div className="bg-[#181C25] rounded-2xl border border-white/10 p-5">
                <div className="text-xs font-semibold text-[#7A8098] uppercase tracking-wider mb-3">
                  Momentos clave
                </div>
                <div className="space-y-2">
                  {data.keyMoments.map((m, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="text-xs text-[#38BDF8] font-mono w-14 flex-shrink-0 pt-0.5">
                        Q{m.period} {fmt(m.clockSeconds)}
                      </div>
                      <p className="text-sm text-white/80">{m.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths & weaknesses grid */}
            {(data?.homeAnalysis || data?.awayAnalysis) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[data.homeAnalysis, data.awayAnalysis].filter(Boolean).map((ta, idx) => (
                  <div key={idx} className="bg-[#181C25] rounded-2xl border border-white/10 p-4">
                    <h3 className="text-sm font-semibold text-white mb-3">{ta!.teamName}</h3>
                    {ta!.strengths?.length > 0 && (
                      <div className="mb-3">
                        <div className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1.5">Fortalezas</div>
                        <ul className="space-y-1">
                          {ta!.strengths.map((s, i) => (
                            <li key={i} className="text-xs text-white/80 flex gap-2">
                              <span className="text-emerald-400 flex-shrink-0">+</span>{s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {ta!.weaknesses?.length > 0 && (
                      <div>
                        <div className="text-[10px] text-red-400 uppercase tracking-wider mb-1.5">Debilidades</div>
                        <ul className="space-y-1">
                          {ta!.weaknesses.map((w, i) => (
                            <li key={i} className="text-xs text-white/80 flex gap-2">
                              <span className="text-red-400 flex-shrink-0">-</span>{w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Tactical conclusion */}
            {data?.tacticalConclusion && (
              <div className="bg-[#181C25] rounded-2xl border border-white/10 p-5">
                <div className="text-xs font-semibold text-[#7A8098] uppercase tracking-wider mb-2">
                  Conclusión táctica
                </div>
                <p className="text-sm text-white/80 leading-relaxed">{data.tacticalConclusion}</p>
              </div>
            )}

            {/* Regenerate */}
            <div className="flex justify-center pb-4">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="px-4 py-2 text-xs text-[#7A8098] hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition"
              >
                {generating ? 'Generando...' : '↻ Regenerar análisis'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
