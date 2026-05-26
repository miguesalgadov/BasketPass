'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { AchievementBadge } from './AchievementBadge';
import type { Achievement } from './types';

interface UnlockedEvent {
  id:          string;
  achievement: Pick<Achievement, 'id' | 'name' | 'description' | 'icon' | 'category' | 'rarity' | 'points'>;
  unlockedAt:  string;
  coachComment?: string | null;
}

interface AchievementUnlockedModalProps {
  event:    UnlockedEvent;
  onClose:  () => void;
}

export function AchievementUnlockedModal({ event, onClose }: AchievementUnlockedModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 300);
  }

  const a = event.achievement;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center transition-all duration-300 ${
        visible ? 'bg-black/70' : 'bg-black/0'
      }`}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full sm:max-w-sm bg-[#181B25] border border-white/10 rounded-t-2xl sm:rounded-2xl p-6 text-center space-y-4 transition-all duration-300 ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-white/30 hover:text-white/70"
        >
          <X size={16} />
        </button>

        <p className="text-[10px] font-semibold text-orange-400 uppercase tracking-widest">
          ¡Nuevo logro desbloqueado!
        </p>

        <div className="flex justify-center">
          <AchievementBadge
            icon={a.icon}
            category={a.category}
            rarity={a.rarity}
            status="UNLOCKED"
            size="lg"
          />
        </div>

        <div>
          <p className="text-base font-black text-white">{a.name}</p>
          <p className="text-xs text-white/50 mt-1">{a.description}</p>
        </div>

        {a.points > 0 && (
          <p className="text-sm font-bold text-yellow-400">+{a.points} puntos</p>
        )}

        {event.coachComment && (
          <p className="text-[11px] text-yellow-400/70 italic border border-white/10 rounded-xl px-3 py-2">
            "{event.coachComment}"
          </p>
        )}

        <button
          onClick={handleClose}
          className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-sm font-bold text-white transition"
        >
          ¡Genial!
        </button>
      </div>
    </div>
  );
}
