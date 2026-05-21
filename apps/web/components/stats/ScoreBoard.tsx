'use client';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  homeScore: number;
  awayScore: number;
  homeName: string;
  awayName: string;
  period: number;
  clockSeconds: number;
  periodScores: { home: number[]; away: number[] };
  homeTimeouts: number;
  awayTimeouts: number;
  isRunning: boolean;
  onClockToggle: () => void;
  onClockEdit: (seconds: number) => void;
  onUndo: () => void;
  onTimeout: (team: 'home' | 'away') => void;
  onNextPeriod: () => void;
  onFinishMatch: () => void;
  canControl: boolean;
  status: string;
  sessionStatus: string;
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function periodLabel(p: number): string {
  if (p <= 4) return `Q${p}`;
  return `OT${p - 4}`;
}

// ── Clock edit modal ──────────────────────────────────────────────────────────

function ClockEditModal({
  currentSeconds,
  onConfirm,
  onClose,
}: {
  currentSeconds: number;
  onConfirm: (seconds: number) => void;
  onClose: () => void;
}) {
  const [minutes, setMinutes] = useState(Math.floor(Math.max(0, currentSeconds) / 60));
  const [secs, setSecs] = useState(Math.max(0, currentSeconds) % 60);

  const total = minutes * 60 + secs;

  function clampM(v: number) { return Math.max(0, Math.min(99, v)); }
  function clampS(v: number) { return Math.max(0, Math.min(59, v)); }

  function adjust(deltaM: number, deltaS: number) {
    const newTotal = Math.max(0, total + deltaM * 60 + deltaS);
    setMinutes(Math.floor(newTotal / 60));
    setSecs(newTotal % 60);
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-[#181C25] rounded-2xl border border-white/10 p-5 w-full max-w-xs">
        <h3 className="text-sm font-semibold text-white mb-4 text-center">Ajustar cronómetro</h3>

        {/* Quick adjustments */}
        <div className="flex justify-center gap-2 mb-4">
          {[
            { label: '+1min', d: [1, 0] },
            { label: '+10s', d: [0, 10] },
            { label: '-10s', d: [0, -10] },
            { label: '-1min', d: [-1, 0] },
          ].map(({ label, d }) => (
            <button
              key={label}
              onClick={() => adjust(d[0], d[1])}
              className="px-2.5 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 rounded-lg transition"
            >
              {label}
            </button>
          ))}
        </div>

        {/* MM : SS inputs */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <div className="flex flex-col items-center gap-1">
            <button onClick={() => setMinutes(v => clampM(v + 1))}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white text-lg font-bold transition">
              +
            </button>
            <input
              type="number"
              min={0} max={99}
              value={minutes}
              onChange={e => setMinutes(clampM(parseInt(e.target.value) || 0))}
              className="w-14 text-center text-2xl font-mono font-bold bg-[#0F1117] border border-[#2A2F3D] text-[#38BDF8] rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-[#F97316]"
            />
            <button onClick={() => setMinutes(v => clampM(v - 1))}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white text-lg font-bold transition">
              -
            </button>
          </div>

          <div className="text-2xl font-mono font-bold text-[#7A8098] pb-1">:</div>

          <div className="flex flex-col items-center gap-1">
            <button onClick={() => setSecs(v => clampS(v + 1))}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white text-lg font-bold transition">
              +
            </button>
            <input
              type="number"
              min={0} max={59}
              value={secs}
              onChange={e => setSecs(clampS(parseInt(e.target.value) || 0))}
              className="w-14 text-center text-2xl font-mono font-bold bg-[#0F1117] border border-[#2A2F3D] text-[#38BDF8] rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-[#F97316]"
            />
            <button onClick={() => setSecs(v => clampS(v - 1))}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white text-lg font-bold transition">
              -
            </button>
          </div>
        </div>

        {/* Common presets */}
        <div className="flex justify-center gap-2 mb-5">
          {[
            { label: '10:00', s: 600 },
            { label: '5:00', s: 300 },
            { label: '2:00', s: 120 },
            { label: '1:00', s: 60 },
          ].map(({ label, s }) => (
            <button
              key={label}
              onClick={() => { setMinutes(Math.floor(s / 60)); setSecs(s % 60); }}
              className="px-2.5 py-1 text-xs font-medium bg-white/10 hover:bg-[#F97316]/20 hover:text-[#F97316] rounded-lg transition"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm text-[#7A8098] hover:text-white border border-white/10 rounded-xl transition">
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(total)}
            className="flex-1 py-2.5 text-sm font-semibold bg-[#F97316] hover:bg-orange-600 text-white rounded-xl transition"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ScoreBoard ────────────────────────────────────────────────────────────────

export function ScoreBoard({
  homeScore, awayScore, homeName, awayName, period, clockSeconds,
  periodScores, homeTimeouts, awayTimeouts,
  isRunning, onClockToggle, onClockEdit,
  onUndo, onTimeout, onNextPeriod, onFinishMatch, canControl, status, sessionStatus,
}: Props) {
  const [editingClock, setEditingClock] = useState(false);
  const notStarted = sessionStatus === 'NOT_STARTED';

  function handleClockEdit(seconds: number) {
    onClockEdit(seconds);
    setEditingClock(false);
  }

  return (
    <>
      {editingClock && (
        <ClockEditModal
          currentSeconds={clockSeconds}
          onConfirm={handleClockEdit}
          onClose={() => setEditingClock(false)}
        />
      )}

      <div className="bg-[#181C25] border-b border-white/10 px-4 py-3">
        <div className="max-w-4xl mx-auto">
          {/* Main score row */}
          <div className="flex items-center justify-between gap-4">
            {/* Home team */}
            <div className="flex-1 text-center">
              <div className="text-xs text-[#7A8098] uppercase tracking-wider truncate">{homeName}</div>
              <div className="text-4xl font-black text-white mt-1">{homeScore}</div>
              <div className="flex justify-center gap-1 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={cn(
                    'w-2 h-2 rounded-full',
                    i < homeTimeouts ? 'bg-[#F97316]' : 'bg-white/10'
                  )} />
                ))}
              </div>
            </div>

            {/* Clock + period */}
            <div className="text-center flex-shrink-0">
              <div className="text-xs text-[#7A8098] uppercase">{periodLabel(period)}</div>

              {/* "Iniciar partido" banner when session not started */}
              {canControl && notStarted && (
                <button
                  onClick={onClockToggle}
                  className="mt-1 px-3 py-1 text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition animate-pulse"
                >
                  ▶ Iniciar partido
                </button>
              )}

              <div className="flex items-center justify-center gap-2 mt-0.5">
                {/* Play/Pause */}
                {canControl && !notStarted && (
                  <button
                    onClick={onClockToggle}
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center transition text-sm',
                      isRunning
                        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                        : 'bg-[#F97316]/20 text-[#F97316] hover:bg-[#F97316]/30'
                    )}
                    title={isRunning ? 'Detener' : 'Iniciar'}
                  >
                    {isRunning ? '⏸' : '▶'}
                  </button>
                )}

                {/* Clock display - click to edit */}
                <button
                  onClick={canControl && !notStarted ? () => setEditingClock(true) : undefined}
                  className={cn(
                    'text-2xl font-mono font-bold transition',
                    isRunning ? 'text-emerald-400' : 'text-[#38BDF8]',
                    canControl && !notStarted && 'hover:opacity-70 cursor-pointer'
                  )}
                  title={canControl && !notStarted ? 'Editar tiempo' : undefined}
                >
                  {formatClock(clockSeconds)}
                </button>
              </div>

              {/* Period scores */}
              <div className="flex gap-2 text-xs text-[#7A8098] mt-1 justify-center">
                {periodScores.home.map((s, i) => (
                  <span key={i} className="text-center w-8">
                    {s ?? 0}-{periodScores.away[i] ?? 0}
                  </span>
                ))}
              </div>
            </div>

            {/* Away team */}
            <div className="flex-1 text-center">
              <div className="text-xs text-[#7A8098] uppercase tracking-wider truncate">{awayName}</div>
              <div className="text-4xl font-black text-white mt-1">{awayScore}</div>
              <div className="flex justify-center gap-1 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={cn(
                    'w-2 h-2 rounded-full',
                    i < awayTimeouts ? 'bg-[#F97316]' : 'bg-white/10'
                  )} />
                ))}
              </div>
            </div>
          </div>

          {/* Control buttons */}
          {canControl && (
            <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
              <button onClick={onUndo}
                className="px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 rounded-lg transition">
                ↩ Deshacer
              </button>
              <button onClick={() => onTimeout('home')}
                className="px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 rounded-lg transition">
                TO Local
              </button>
              <button onClick={() => onTimeout('away')}
                className="px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 rounded-lg transition">
                TO Visita
              </button>
              <button onClick={onNextPeriod}
                className="px-3 py-1.5 text-xs font-medium bg-[#38BDF8]/20 text-[#38BDF8] hover:bg-[#38BDF8]/30 rounded-lg transition">
                Fin período
              </button>
              {status !== 'FINISHED' && (
                <button onClick={onFinishMatch}
                  className="px-3 py-1.5 text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition">
                  Finalizar
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
