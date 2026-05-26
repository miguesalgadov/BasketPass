'use client';

import { useState } from 'react';
import { ChevronRight, Check, Loader2 } from 'lucide-react';
import { AchievementBadge } from './AchievementBadge';
import { CATEGORY_CONFIG } from './types';
import type { Achievement } from './types';

interface Player {
  id:   string;
  name: string;
  jerseyNumber?: number | null;
}

interface CoachAwardFormProps {
  players:      Player[];
  achievements: Achievement[];
  onSubmit:     (playerId: string, achievementId: string, comment: string) => Promise<void>;
  onCancel?:    () => void;
}

type Step = 1 | 2 | 3;

export function CoachAwardForm({ players, achievements, onSubmit, onCancel }: CoachAwardFormProps) {
  const [step,          setStep]    = useState<Step>(1);
  const [playerId,      setPlayer]  = useState('');
  const [achievementId, setAchiev]  = useState('');
  const [comment,       setComment] = useState('');
  const [loading,       setLoading] = useState(false);
  const [done,          setDone]    = useState(false);

  const manual = achievements.filter((a) => a.triggerType === 'MANUAL' && a.isActive !== false);

  const selectedPlayer  = players.find((p) => p.id === playerId);
  const selectedAchiev  = achievements.find((a) => a.id === achievementId);

  async function handleSubmit() {
    if (!playerId || !achievementId) return;
    setLoading(true);
    try {
      await onSubmit(playerId, achievementId, comment.trim());
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="text-center py-10 space-y-3">
        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
          <Check size={22} className="text-green-400" />
        </div>
        <p className="text-sm font-semibold text-white/90">¡Reconocimiento otorgado!</p>
        <p className="text-[11px] text-white/40">
          {selectedAchiev?.name} entregado a {selectedPlayer?.name}.
        </p>
        {onCancel && (
          <button onClick={onCancel} className="text-xs text-white/40 hover:text-white/70 underline mt-2">
            Cerrar
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <div className="flex items-center gap-1.5">
        {([1, 2, 3] as Step[]).map((s) => (
          <div
            key={s}
            className={`flex-1 h-0.5 rounded-full transition-all ${
              s <= step ? 'bg-orange-500' : 'bg-white/10'
            }`}
          />
        ))}
      </div>

      {/* Step 1: Select player */}
      {step === 1 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Selecciona un jugador</p>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {players.map((p) => (
              <button
                key={p.id}
                onClick={() => { setPlayer(p.id); setStep(2); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition ${
                  playerId === p.id
                    ? 'bg-orange-500/10 border-orange-500/40 text-orange-400'
                    : 'bg-white/[0.03] border-white/8 text-white/80 hover:border-white/20'
                }`}
              >
                <span className="text-xs font-semibold">
                  {p.jerseyNumber != null && (
                    <span className="text-white/30 mr-2">#{p.jerseyNumber}</span>
                  )}
                  {p.name}
                </span>
                <ChevronRight size={14} className="text-white/30" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Select achievement */}
      {step === 2 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Selecciona la insignia</p>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {manual.map((a) => {
              const { color } = CATEGORY_CONFIG[a.category];
              return (
                <button
                  key={a.id}
                  onClick={() => { setAchiev(a.id); setStep(3); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition ${
                    achievementId === a.id
                      ? 'border-orange-500/40'
                      : 'bg-white/[0.03] border-white/8 hover:border-white/20'
                  }`}
                  style={achievementId === a.id ? { background: color + '15', borderColor: color + '44' } : {}}
                >
                  <AchievementBadge icon={a.icon} category={a.category} rarity={a.rarity} status="UNLOCKED" size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white/90">{a.name}</p>
                    <p className="text-[10px] text-white/40 truncate">{a.description}</p>
                  </div>
                </button>
              );
            })}
            {manual.length === 0 && (
              <p className="text-center text-white/30 text-sm py-6">No hay insignias manuales configuradas.</p>
            )}
          </div>
          <button onClick={() => setStep(1)} className="text-[11px] text-white/40 hover:text-white/70">
            ← Cambiar jugador
          </button>
        </div>
      )}

      {/* Step 3: Comment + confirm */}
      {step === 3 && selectedAchiev && selectedPlayer && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/10">
            <AchievementBadge
              icon={selectedAchiev.icon}
              category={selectedAchiev.category}
              rarity={selectedAchiev.rarity}
              status="UNLOCKED"
              size="md"
            />
            <div>
              <p className="text-xs font-bold text-white/90">{selectedAchiev.name}</p>
              <p className="text-[11px] text-white/50">{selectedPlayer.name}</p>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-white/50">Comentario del coach (opcional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="Ej: Excelente actitud durante el torneo..."
              className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-xs text-white/90 placeholder:text-white/20 resize-none focus:outline-none focus:border-orange-500/40"
            />
            <p className="text-[10px] text-white/25 text-right">{comment.length}/200</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs text-white/50 hover:text-white/70 transition"
            >
              Atrás
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-xs font-bold text-white transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={13} className="animate-spin" />}
              Otorgar reconocimiento
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
