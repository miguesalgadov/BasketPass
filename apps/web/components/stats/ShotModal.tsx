'use client';
import { useRef } from 'react';

interface Props {
  action: string;
  onPlace: (x: number, y: number) => void;
  onCancel: () => void;
}

function isMade(action: string) {
  return ['FG2_MADE', 'FG3_MADE', 'FT_MADE'].includes(action);
}

function label(action: string) {
  if (action.startsWith('FG3')) return '3 puntos';
  if (action.startsWith('FT')) return 'Tiro libre';
  return '2 puntos';
}

export function ShotModal({ action, onPlace, onCancel }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onPlace(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
  }

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1F2333] rounded-2xl p-5 w-full max-w-sm">
        <h3 className="text-sm font-semibold text-white mb-1 text-center">
          {isMade(action) ? '✓ Anotado' : '✗ Fallado'} — {label(action)}
        </h3>
        <p className="text-xs text-[#7A8098] text-center mb-4">Tocá la posición en la cancha</p>
        <svg
          ref={svgRef}
          viewBox="0 0 200 200"
          className="w-full cursor-crosshair rounded-xl border border-white/10"
          style={{ background: '#1a2e4a' }}
          onClick={handleClick}
        >
          {/* Court outline */}
          <rect x="10" y="10" width="180" height="180" fill="none" stroke="#334466" strokeWidth="2" />
          {/* Paint area */}
          <rect x="60" y="10" width="80" height="60" fill="none" stroke="#445566" strokeWidth="1.5" />
          {/* Free throw circle */}
          <circle cx="100" cy="70" r="25" fill="none" stroke="#445566" strokeWidth="1.5" />
          {/* Basket */}
          <circle cx="100" cy="22" r="6" fill="none" stroke="#F97316" strokeWidth="2" />
          <line x1="94" y1="22" x2="106" y2="22" stroke="#F97316" strokeWidth="1" />
          {/* Three-point arc (simplified) */}
          <path d="M 30 10 Q 30 120 100 130 Q 170 120 170 10" fill="none" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="4 2" />
          {/* Mid court line */}
          <line x1="10" y1="190" x2="190" y2="190" stroke="#334466" strokeWidth="1" />
          <line x1="10" y1="100" x2="190" y2="100" stroke="#334466" strokeWidth="1" />
          <circle cx="100" cy="100" r="20" fill="none" stroke="#334466" strokeWidth="1" />
          {/* Corner three lines */}
          <line x1="30" y1="10" x2="30" y2="55" stroke="#38BDF8" strokeWidth="1" strokeDasharray="4 2" />
          <line x1="170" y1="10" x2="170" y2="55" stroke="#38BDF8" strokeWidth="1" strokeDasharray="4 2" />
        </svg>
        <p className="text-[10px] text-[#7A8098] text-center mt-2">Tocá donde se realizó el tiro</p>
        <button
          onClick={onCancel}
          className="w-full mt-3 text-sm text-[#7A8098] hover:text-white transition py-1"
        >
          Cancelar (registrar sin posición)
        </button>
      </div>
    </div>
  );
}
