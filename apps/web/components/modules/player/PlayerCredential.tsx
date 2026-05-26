'use client';

import { useEffect, useRef } from 'react';
import { Camera, Trash2 } from 'lucide-react';

interface Club  { name: string; primaryColor?: string | null; slug?: string | null; logo?: string | null }
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
  onAvatarChange?: (file: File) => void;
  onAvatarDelete?: () => void;
  paymentStatus?: string;
  season?: {
    matchesPlayed: number;
    attendanceRate: number;
    totalAssists?: number;
    totalPoints?: number;
    totalRebounds?: number;
  };
  capturing?: boolean;
}

const PAYMENT: Record<string, { label: string; color: string }> = {
  OK:      { label: 'Al día',    color: '#22C55E' },
  WARNING: { label: 'Pendiente', color: '#F59E0B' },
  DANGER:  { label: 'Vencido',   color: '#EF4444' },
};

const POSITIONS: Record<string, string> = {
  PG: 'Base',
  SG: 'Escolta',
  SF: 'Alero',
  PF: 'Ala-Pívot',
  C:  'Pívot',
};

function drawIconPaths(ctx: CanvasRenderingContext2D, pathsHtml: string, color: string, iconSize: number): void {
  const scale = iconSize / 24;
  ctx.save();
  ctx.scale(scale, scale);
  ctx.strokeStyle = color;
  ctx.fillStyle = 'none';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // <path d="...">
  for (const m of pathsHtml.matchAll(/\bd="([^"]+)"/g)) {
    ctx.stroke(new Path2D(m[1]));
  }
  // <circle cx cy r>
  for (const m of pathsHtml.matchAll(/cx="([^"]+)"\s+cy="([^"]+)"\s+r="([^"]+)"/g)) {
    ctx.beginPath(); ctx.arc(+m[1], +m[2], +m[3], 0, Math.PI * 2); ctx.stroke();
  }
  // <polygon points="...">
  for (const m of pathsHtml.matchAll(/points="([^"]+)"/g)) {
    const pts = m[1].trim().split(/\s+/).map(Number);
    ctx.beginPath();
    for (let i = 0; i < pts.length; i += 2) { i === 0 ? ctx.moveTo(pts[i], pts[i+1]) : ctx.lineTo(pts[i], pts[i+1]); }
    ctx.closePath(); ctx.stroke();
  }
  ctx.restore();
}

function SvgIcon({ paths, color, size, style }: { paths: string; color: string; size: number; style?: React.CSSProperties }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);
    drawIconPaths(ctx, paths, color, size);
  }, [paths, color, size]);
  return <canvas ref={ref} width={size} height={size} style={{ display: 'block', ...style }} />;
}

const ICON_PATHS = {
  users:        '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  checkCircle2: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  trophy:       '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  zap:          '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  shieldCheck:  '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/>',
};

export function PlayerCredential({ player, onAvatarChange, onAvatarDelete, paymentStatus = 'OK', season, capturing = false }: Props) {
  const club    = player.club;
  const accent  = club?.primaryColor || '#F97316';
  const year    = new Date().getFullYear();
  const initials = club?.name ? club.name.slice(0, 2).toUpperCase() : 'BP';
  const idCode  = `BP-${year}-${player.id.slice(0, 6).toUpperCase()}`;
  const pm      = PAYMENT[paymentStatus] ?? PAYMENT.OK;

  const apiBase   = process.env.NEXT_PUBLIC_API_URL ?? '';
  const avatarSrc = player.photoUrl
    ? (player.photoUrl.startsWith('http') || player.photoUrl.startsWith('data:') ? player.photoUrl : `${apiBase}${player.photoUrl}`)
    : null;

  const stats = [
    { iconPaths: ICON_PATHS.users,        iconColor: '#1A2542', label: 'Equipo',        value: player.team?.name ?? '—',                    color: '#1A2542' },
    { iconPaths: ICON_PATHS.checkCircle2, iconColor: pm.color,  label: 'Estado cuota',  value: pm.label,                                    color: pm.color  },
    { iconPaths: ICON_PATHS.trophy,       iconColor: '#1A2542', label: 'Partidos',       value: String(season?.matchesPlayed ?? 0),           color: '#1A2542' },
    { iconPaths: ICON_PATHS.zap,          iconColor: '#1A2542', label: 'Asistencias',   value: String(season?.totalAssists ?? 0),            color: '#1A2542' },
  ];

  return (
    <div style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.35)', width: '100%' }}>

      {/* ── HEADER: BasketPass branding — always dark, never club color ── */}
      <div style={{ background: '#0D1530', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* BasketPass logo icon — ball half-inside ticket, speed lines left, dots right */}
        <svg width="42" height="34" viewBox="0 0 46 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
          {/* Ticket outline (landscape) — white on dark bg */}
          <rect x="22" y="3" width="23" height="30" rx="4" fill="none" stroke="white" strokeWidth="1.9"/>
          {/* Perforation dashed divider */}
          <line x1="38.5" y1="6" x2="38.5" y2="30" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" strokeDasharray="1.5 2"/>
          {/* Blue perforation dots (right stub of ticket) */}
          <circle cx="42" cy="11"   r="1.4" fill="#60A5FA"/>
          <circle cx="42" cy="17"   r="1.4" fill="#60A5FA"/>
          <circle cx="42" cy="23"   r="1.4" fill="#60A5FA"/>
          <circle cx="42" cy="29"   r="1.4" fill="#60A5FA"/>
          {/* Orange basketball — center aligned with ticket left edge, half outside */}
          <circle cx="22" cy="18" r="13" fill="#F97316"/>
          {/* Basketball seam lines */}
          <path d="M9.5 18 Q22 11.5 34.5 18"  stroke="white" strokeWidth="1.3" fill="none"/>
          <path d="M9.5 18 Q22 24.5 34.5 18"  stroke="white" strokeWidth="1.3" fill="none"/>
          <line x1="22" y1="5" x2="22" y2="31" stroke="white" strokeWidth="1.3"/>
          {/* Speed lines to the left of ball — orange x2 + blue x1 */}
          <line x1="0.5" y1="12.5" x2="8.5" y2="12.5" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="2"   y1="18"   x2="8.5" y2="18"   stroke="#F97316" strokeWidth="2"   strokeLinecap="round"/>
          <line x1="0.5" y1="23.5" x2="8.5" y2="23.5" stroke="#60A5FA" strokeWidth="2"   strokeLinecap="round"/>
        </svg>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 18, letterSpacing: '-0.3px' }}>Basket</span>
          <span style={{ color: '#F97316', fontWeight: 900, fontSize: 18, letterSpacing: '-0.3px' }}>Pass</span>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 8, color: 'rgba(255,255,255,0.5)', letterSpacing: '2px', textTransform: 'uppercase' }}>Carnet Digital</span>
      </div>

      {/* ── DARK HERO ── */}
      <div style={{ background: 'linear-gradient(150deg, #0D1530 0%, #152248 100%)', position: 'relative' }}>

        {/* Decorative dots */}
        <div style={{ position: 'absolute', top: 6, right: 6, display: 'grid', gridTemplateColumns: 'repeat(4,6px)', gap: 4, opacity: 0.15, pointerEvents: 'none' }}>
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: accent }} />
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'stretch', minHeight: 195 }}>

          {/* Photo column */}
          <div style={{ width: '46%', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
            <img
              data-player-photo
              src={avatarSrc ?? '/players/pezoa.jpg'}
              alt={player.firstName}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }}
            />
            {/* Gradient overlay right edge */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 55%, #0D1530 100%)' }} />
            {/* Camera controls */}
            {onAvatarChange && !capturing && (
              <>
                <label style={{ position: 'absolute', inset: 0, cursor: 'pointer', opacity: 0, transition: 'opacity 0.2s', background: 'rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                  className="hover:opacity-100 active:opacity-100">
                  <input type="file" accept="image/*" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) onAvatarChange(f); e.target.value = ''; }} />
                  <Camera size={20} color="#fff" style={{ pointerEvents: 'none' }} />
                  <span style={{ fontSize: 9, color: '#fff', fontWeight: 500, pointerEvents: 'none' }}>Cambiar</span>
                </label>
                <label style={{ position: 'absolute', bottom: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.4)', overflow: 'hidden', zIndex: 20 }}>
                  <input type="file" accept="image/*" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) onAvatarChange(f); e.target.value = ''; }} />
                  <Camera size={13} color="#fff" style={{ pointerEvents: 'none' }} />
                </label>
              </>
            )}
            {avatarSrc && onAvatarDelete && !capturing && (
              <button type="button" onClick={onAvatarDelete}
                style={{ position: 'absolute', bottom: 8, right: 44, width: 28, height: 28, borderRadius: '50%', background: '#EF4444', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.4)', zIndex: 20 }}>
                <Trash2 size={13} style={{ color: '#fff' }} />
              </button>
            )}
          </div>

          {/* Info column */}
          <div style={{ flex: 1, padding: '14px 14px 14px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', marginBottom: 4, letterSpacing: '0.5px' }}>{club?.name ?? 'BasketPass'}</p>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: '#fff', textTransform: 'uppercase', lineHeight: 1.05, letterSpacing: '-0.5px', margin: 0 }}>
                {player.lastName}
              </h2>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.75)', marginTop: 3, marginBottom: 0 }}>{player.firstName}</p>
            </div>

            <div style={{ marginTop: 12 }}>
              {[
                ['Categoría', player.team?.category ?? '—'],
                ['Posición',  player.position ? (POSITIONS[player.position] ?? player.position) : '—'],
                ['Dorsal',    player.jerseyNumber != null ? `#${player.jerseyNumber}` : '—'],
              ].map(([lbl, val]) => (
                <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '1px', width: 50, flexShrink: 0 }}>{lbl}</span>
                  <span style={{ width: 1, height: 10, background: 'rgba(255,255,255,0.18)', flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── LIGHT SECTION ── */}
      <div style={{ background: '#EDF1F9', padding: '14px 16px 0' }}>

        {/* ID row + club badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
          <div>
            <p style={{ fontSize: 7, color: '#8896B0', textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 2px' }}>ID Jugador</p>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#1A2542', fontFamily: 'monospace', letterSpacing: '1px', margin: '0 0 6px' }}>{idCode}</p>
            <p style={{ fontSize: 7, color: '#8896B0', textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 1px' }}>Temporada</p>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#1A2542', margin: '0 0 5px' }}>{year}</p>
            <p style={{ fontSize: 7, color: '#8896B0', textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 1px' }}>Válido hasta</p>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#1A2542', margin: 0 }}>31/12/{year}</p>
          </div>
          {/* Club badge */}
          <div style={{ width: 90, height: 90, background: club?.logo ? '#fff' : `linear-gradient(135deg, ${accent} 0%, ${accent}BB 100%)`, borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 14px rgba(0,0,0,0.14)', overflow: 'hidden', padding: 0 }}>
            {club?.logo ? (
              <img
                data-club-logo
                src={club.logo}
                alt={club.name}
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              />
            ) : (
              <>
                <span style={{ color: '#fff', fontWeight: 900, fontSize: 24, lineHeight: 1, display: 'block' }}>{initials}</span>
                <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 7, letterSpacing: '1px', marginTop: 3, textTransform: 'uppercase', maxWidth: 76, textAlign: 'center', lineHeight: 1.2 }}>
                  {club?.name?.slice(0, 10) ?? 'Club'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Verified */}
        <div style={{ background: '#fff', borderRadius: 8, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ width: 30, height: 30, background: '#1A2542', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <SvgIcon paths={ICON_PATHS.shieldCheck} color="#fff" size={15} />
          </div>
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, color: '#1A2542', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Carnet Verificado</p>
            <p style={{ fontSize: 8, color: '#8896B0', margin: 0, marginTop: 1 }}>Club verificado en BasketPass</p>
          </div>
        </div>

        {/* Datos clave */}
        <div style={{ paddingBottom: 14 }}>
          <p style={{ fontSize: 7, color: '#8896B0', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 10, marginTop: 0 }}>Datos Clave</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {stats.map(({ iconPaths, iconColor, label, value, color }) => (
              <div key={label} style={{ textAlign: 'center', background: '#fff', borderRadius: 8, padding: '8px 4px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <SvgIcon paths={iconPaths} color={iconColor} size={14} style={{ margin: '0 auto 4px' }} />
                <p style={{ fontSize: 6.5, color: '#8896B0', margin: '0 0 2px', letterSpacing: '0.3px', lineHeight: 1.2 }}>{label}</p>
                <p style={{ fontSize: 11, fontWeight: 700, color, margin: 0, lineHeight: 1 }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ background: '#0D1530', padding: '11px 16px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 600, fontSize: 11, margin: 0, letterSpacing: '0.3px', fontStyle: 'italic', textAlign: 'center' }}>
          Tu Pasión, tu identidad, tu juego.
        </p>
      </div>

    </div>
  );
}
