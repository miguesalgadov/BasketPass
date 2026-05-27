'use client';

import { useRef, useState } from 'react';
import { Download, ChevronDown, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import type { CromoFormat } from './ShareableCromoCard';

const FORMATS: { id: CromoFormat; label: string; emoji: string; width: number; height: number }[] = [
  { id: 'square', label: 'Post cuadrado (1080×1080)',  emoji: '📷', width: 1080, height: 1080 },
  { id: 'story',  label: 'Story (1080×1920)',           emoji: '📱', width: 1080, height: 1920 },
  { id: 'og',     label: 'WhatsApp / Telegram (1200×630)', emoji: '💬', width: 1200, height: 630 },
];

interface CromoDownloadMenuProps {
  targetRef:       React.RefObject<HTMLDivElement | null>;
  onFormatChange?: (format: CromoFormat) => void;
  achievementName: string;
}

export function CromoDownloadMenu({ targetRef, onFormatChange, achievementName }: CromoDownloadMenuProps) {
  const [open,        setOpen]        = useState(false);
  const [downloading, setDownloading] = useState<CromoFormat | null>(null);

  const handleDownload = async (fmt: typeof FORMATS[0]) => {
    if (!targetRef.current) return;
    setOpen(false);
    setDownloading(fmt.id);

    // Switch the card to the target format so html2canvas captures correct ratio
    onFormatChange?.(fmt.id);

    // Wait a tick for React to re-render the new format
    await new Promise((r) => setTimeout(r, 100));

    try {
      const el = targetRef.current;
      const domW = el.offsetWidth || 320;
      const scale = fmt.width / domW;

      const canvas = await html2canvas(el, {
        scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `${achievementName.replace(/\s+/g, '-').toLowerCase()}-${fmt.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('Download failed', e);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={downloading !== null}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white/70 hover:text-white hover:bg-white/10 transition w-full justify-center"
      >
        {downloading ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Download size={12} />
        )}
        Descargar
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 left-0 right-0 rounded-xl bg-[#1E232B] border border-white/10 shadow-xl overflow-hidden z-50">
          {FORMATS.map((fmt) => (
            <button
              key={fmt.id}
              onClick={() => handleDownload(fmt)}
              className="flex items-center gap-2 px-3 py-2.5 hover:bg-white/[0.05] transition w-full text-left"
            >
              <span className="text-sm">{fmt.emoji}</span>
              <span className="text-[11px] text-white/70">{fmt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
