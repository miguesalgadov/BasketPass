'use client';

import { useState } from 'react';
import { Share2, Check, Link } from 'lucide-react';
import type { Achievement } from './types';

interface ShareSheetMenuProps {
  achievement:          Achievement;
  playerAchievementId?: string;
}

export function ShareSheetMenu({ achievement, playerAchievementId }: ShareSheetMenuProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = playerAchievementId
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/share/cromo/${playerAchievementId}`
    : null;

  const handleShare = async () => {
    if (!shareUrl) return;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `¡Desbloqueé ${achievement.name}!`,
          text:  `${achievement.description} — Mira mi progreso en BasketPass`,
          url:   shareUrl,
        });
        return;
      } catch {
        // User cancelled or API not supported, fall through to copy
      }
    }

    // Fallback: copy link
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  };

  return (
    <button
      onClick={handleShare}
      disabled={!shareUrl}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0057FF]/20 border border-[#0057FF]/30 text-xs text-[#0057FF] hover:bg-[#0057FF]/30 transition w-full justify-center disabled:opacity-40"
    >
      {copied ? (
        <>
          <Check size={12} className="text-green-400" />
          <span className="text-green-400">Link copiado</span>
        </>
      ) : (
        <>
          <Share2 size={12} />
          Compartir
        </>
      )}
    </button>
  );
}
