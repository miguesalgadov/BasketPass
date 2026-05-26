'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { AchievementBadge } from './AchievementBadge';
import { CATEGORY_CONFIG, RARITY_LABEL } from './types';
import type { Achievement } from './types';

interface AchievementCatalogProps {
  achievements: Achievement[];
  onToggle?:    (id: string, isActive: boolean) => void;
}

export function AchievementCatalog({ achievements, onToggle }: AchievementCatalogProps) {
  const [toggling, setToggling] = useState<string | null>(null);

  async function handleToggle(a: Achievement) {
    if (!onToggle) return;
    setToggling(a.id);
    try {
      await onToggle(a.id, !a.isActive);
    } finally {
      setToggling(null);
    }
  }

  return (
    <div className="space-y-1.5">
      {achievements.map((a) => {
        const { color } = CATEGORY_CONFIG[a.category];
        const active    = a.isActive !== false;
        return (
          <div
            key={a.id}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
              active ? 'bg-white/[0.04] border-white/10' : 'bg-white/[0.01] border-white/5 opacity-50'
            }`}
          >
            <AchievementBadge
              icon={a.icon}
              category={a.category}
              rarity={a.rarity}
              status={active ? 'IN_PROGRESS' : 'LOCKED'}
              size="sm"
            />

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white/90 truncate">{a.name}</p>
              <p className="text-[10px] text-white/40 truncate">{a.description}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: color + '22', color, border: `1px solid ${color}44` }}
                >
                  {CATEGORY_CONFIG[a.category].label}
                </span>
                {a.rarity !== 'COMMON' && (
                  <span className="text-[9px] text-white/30">{RARITY_LABEL[a.rarity]}</span>
                )}
                {a.points > 0 && (
                  <span className="text-[9px] text-yellow-400/60">{a.points} pts</span>
                )}
              </div>
            </div>

            {onToggle && (
              <button
                onClick={() => handleToggle(a)}
                disabled={toggling === a.id}
                className="p-1.5 rounded-lg hover:bg-white/10 transition text-white/40 hover:text-white/70"
                title={active ? 'Desactivar' : 'Activar'}
              >
                {active ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
            )}
          </div>
        );
      })}

      {achievements.length === 0 && (
        <p className="text-center text-white/30 text-sm py-10">No hay insignias configuradas.</p>
      )}
    </div>
  );
}
