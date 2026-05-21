'use client';

import { Camera, ShieldCheck } from 'lucide-react';

interface Club  { name: string; primaryColor?: string | null; slug?: string | null }
interface Team  { name: string; category: string }
interface PlayerData {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  jerseyNumber?: number | null;
  position?: string | null;
  height?: number | null;
  weight?: number | null;
  team?: Team | null;
  club?: Club | null;
  seasonAvgPoints: number;
  seasonAvgRebounds: number;
  seasonAvgAssists: number;
  attendanceRate: number;
}

interface Props {
  player: PlayerData;
  onAvatarChange?: () => void;
  paymentStatus?: string;
  season?: { matchesPlayed: number; attendanceRate: number };
}

function QRCode() {
  return (
    <div className="rounded-lg overflow-hidden bg-white p-1.5 flex-shrink-0" style={{ width: 80, height: 80 }}>
      <svg viewBox="0 0 21 21" className="w-full h-full" shapeRendering="crispEdges">
        {/* Finder: top-left */}
        <rect x="0" y="0" width="7" height="7" fill="#000" />
        <rect x="1" y="1" width="5" height="5" fill="#fff" />
        <rect x="2" y="2" width="3" height="3" fill="#000" />
        {/* Finder: top-right */}
        <rect x="14" y="0" width="7" height="7" fill="#000" />
        <rect x="15" y="1" width="5" height="5" fill="#fff" />
        <rect x="16" y="2" width="3" height="3" fill="#000" />
        {/* Finder: bottom-left */}
        <rect x="0" y="14" width="7" height="7" fill="#000" />
        <rect x="1" y="15" width="5" height="5" fill="#fff" />
        <rect x="2" y="16" width="3" height="3" fill="#000" />
        {/* Timing & data pattern */}
        {([
          [8,0],[10,0],[12,0],[9,1],[11,1],[8,2],[10,2],[12,2],
          [9,3],[11,3],[8,4],[10,4],[9,5],[12,5],[8,6],[11,6],
          [0,8],[2,8],[4,8],[6,8],[8,8],[10,8],[12,8],[14,8],[16,8],[18,8],[20,8],
          [1,9],[4,9],[7,9],[9,9],[11,9],[14,9],[17,9],[19,9],
          [0,10],[3,10],[5,10],[8,10],[10,10],[12,10],[15,10],[18,10],[20,10],
          [2,11],[4,11],[6,11],[9,11],[11,11],[13,11],[16,11],[19,11],
          [1,12],[3,12],[5,12],[8,12],[10,12],[12,12],[14,12],[17,12],[20,12],
          [8,13],[10,13],[13,13],[15,13],[18,13],
          [8,14],[11,14],[14,14],[16,14],[19,14],
          [9,15],[12,15],[14,15],[17,15],[20,15],
          [8,16],[10,16],[13,16],[15,16],[18,16],
          [9,17],[11,17],[14,17],[16,17],[19,17],
          [8,18],[12,18],[14,18],[17,18],[20,18],
          [9,19],[11,19],[13,19],[15,19],[18,19],
          [8,20],[10,20],[12,20],[14,20],[16,20],[19,20],
        ] as [number,number][]).map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="1" height="1" fill="#000" />
        ))}
      </svg>
    </div>
  );
}

const PAYMENT_LABEL: Record<string, { label: string; color: string }> = {
  OK:      { label: 'Al día',    color: '#22C55E' },
  WARNING: { label: 'Pendiente', color: '#F59E0B' },
  DANGER:  { label: 'Vencido',   color: '#EF4444' },
};

export function PlayerCredential({ player, onAvatarChange, paymentStatus = 'OK', season }: Props) {
  const club   = player.club;
  const accent = club?.primaryColor ?? '#F97316';
  const year   = new Date().getFullYear();
  const initials = club?.name ? club.name.slice(0, 2).toUpperCase() : 'BP';
  const idCode = `BP-${year}-${player.id.slice(0, 6).toUpperCase()}`;
  const pm     = PAYMENT_LABEL[paymentStatus] ?? PAYMENT_LABEL.OK;

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const avatarSrc = player.photoUrl
    ? (player.photoUrl.startsWith('http') ? player.photoUrl : `${apiBase}${player.photoUrl}`)
    : null;

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-2xl w-full select-none"
      style={{ background: 'linear-gradient(160deg, #0D1525 0%, #1A2540 100%)' }}
    >
      {/* Accent stripe */}
      <div className="h-1 w-full" style={{ background: accent }} />

      {/* ── HERO: name + photo ── */}
      <div className="relative overflow-hidden" style={{ minHeight: 190 }}>
        {/* Decorative jersey number watermark */}
        <span
          className="absolute -right-2 -top-2 font-black leading-none text-white/[0.05] select-none pointer-events-none"
          style={{ fontSize: 140 }}
        >
          {player.jerseyNumber ?? ''}
        </span>

        {/* Left: header content */}
        <div className="relative z-10 px-5 pt-4 pb-4 pr-[140px]">
          {/* Club badge */}
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-xs flex-shrink-0"
              style={{ background: accent }}
            >
              {initials}
            </div>
            <div>
              <p className="text-[8px] text-white/40 tracking-[3px] uppercase leading-tight">Carnet Digital</p>
              <p className="text-[11px] text-white/70 font-semibold leading-tight">{club?.name ?? 'BasketPass'}</p>
            </div>
          </div>

          {/* Name */}
          <h2 className="text-[28px] font-black text-white uppercase leading-none tracking-tight">
            {player.lastName}
          </h2>
          <p className="text-sm font-medium text-white/60 mt-0.5">{player.firstName}</p>

          {/* Category / Position / Dorsal */}
          <div className="mt-4 space-y-1">
            {[
              ['Categoría', player.team?.category ?? '—'],
              ['Posición',  player.position       ?? '—'],
              ['Dorsal',    player.jerseyNumber != null ? `#${player.jerseyNumber}` : '—'],
            ].map(([lbl, val]) => (
              <div key={lbl} className="flex items-center gap-2">
                <span className="text-[9px] text-white/35 w-16 uppercase tracking-wide">{lbl}</span>
                <span className="text-[11px] font-bold text-white/90">{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: player photo */}
        <div className="absolute top-0 right-0 bottom-0 w-[130px] overflow-hidden">
          <img
            src={avatarSrc ?? '/players/pezoa.jpg'}
            alt={player.firstName}
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #0D1525 0%, transparent 45%)' }} />
          <div className="absolute bottom-0 left-0 right-0 h-8" style={{ background: 'linear-gradient(to top, #1A2540 0%, transparent 100%)' }} />
          {onAvatarChange && (
            <button
              onClick={onAvatarChange}
              className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1 opacity-0 hover:opacity-100 active:opacity-100 transition-opacity"
              title="Cambiar foto"
            >
              <Camera size={20} className="text-white" />
              <span className="text-[9px] text-white font-medium">Cambiar</span>
            </button>
          )}
        </div>
      </div>

      {/* ── ID + QR ── */}
      <div className="mx-5 border-t border-white/10" />
      <div className="px-5 py-4 flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1">
          <div>
            <p className="text-[8px] text-white/30 tracking-[2px] uppercase">ID Jugador</p>
            <p className="text-xs font-mono font-bold text-white/80 tracking-wider">{idCode}</p>
          </div>
          <div>
            <p className="text-[8px] text-white/30 tracking-[2px] uppercase">Temporada</p>
            <p className="text-xs font-bold text-white/80">{year}</p>
          </div>
          <div>
            <p className="text-[8px] text-white/30 tracking-[2px] uppercase">Válido hasta</p>
            <p className="text-xs font-bold text-white/80">31/12/{year}</p>
          </div>
          {/* Verified badge */}
          <div className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-2.5 py-1 w-fit mt-1">
            <ShieldCheck size={11} className="text-emerald-400" />
            <span className="text-[9px] text-emerald-400 font-semibold tracking-wide">Carnet verificado</span>
          </div>
        </div>
        <QRCode />
      </div>

      {/* ── Datos clave ── */}
      <div className="mx-5 border-t border-white/10" />
      <div className="px-5 py-4">
        <p className="text-[8px] text-white/30 tracking-[2px] uppercase mb-3">Datos clave</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
          <div>
            <p className="text-[8px] text-white/35">Equipo</p>
            <p className="text-xs font-bold text-white/80">{player.team?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-[8px] text-white/35">Estado cuota</p>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: pm.color }} />
              <p className="text-xs font-bold" style={{ color: pm.color }}>{pm.label}</p>
            </div>
          </div>
          <div>
            <p className="text-[8px] text-white/35">Partidos</p>
            <p className="text-xs font-bold text-white/80">{season?.matchesPlayed ?? '—'}</p>
          </div>
          <div>
            <p className="text-[8px] text-white/35">Asistencia</p>
            <p className="text-xs font-bold text-white/80">{season?.attendanceRate ?? player.attendanceRate}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
