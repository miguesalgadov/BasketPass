'use client';

import { Camera, ShieldCheck, Trash2, Users, Trophy, Zap, CheckCircle2 } from 'lucide-react';

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

export function PlayerCredential({ player, onAvatarChange, onAvatarDelete, paymentStatus = 'OK', season, capturing = false }: Props) {
  const club    = player.club;
  const accent  = club?.primaryColor ?? '#F97316';
  const year    = new Date().getFullYear();
  const initials = club?.name ? club.name.slice(0, 2).toUpperCase() : 'BP';
  const idCode  = `BP-${year}-${player.id.slice(0, 6).toUpperCase()}`;
  const pm      = PAYMENT[paymentStatus] ?? PAYMENT.OK;

  const apiBase   = process.env.NEXT_PUBLIC_API_URL ?? '';
  const avatarSrc = player.photoUrl
    ? (player.photoUrl.startsWith('http') || player.photoUrl.startsWith('data:') ? player.photoUrl : `${apiBase}${player.photoUrl}`)
    : null;

  const stats = [
    { Icon: Users,       label: 'Equipo',        value: player.team?.name ?? '—',                    color: '#1A2542' },
    { Icon: CheckCircle2,label: 'Estado cuota',   value: pm.label,                                    color: pm.color  },
    { Icon: Trophy,      label: 'Partidos',       value: String(season?.matchesPlayed ?? 0),           color: '#1A2542' },
    { Icon: Zap,         label: 'Asistencias',    value: String(season?.totalAssists ?? 0),            color: '#1A2542' },
  ];

  return (
    <div style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.35)', width: '100%' }}>

      {/* ── HEADER: BasketPass branding ── */}
      <div style={{ background: accent, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* BasketPass icon: basketball flying through ticket */}
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
          {/* Ticket outline */}
          <rect x="9" y="2" width="20" height="26" rx="3" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.4"/>
          {/* Ticket notch left side */}
          <path d="M9 11.5 Q5.5 11.5 5.5 15 Q5.5 18.5 9 18.5" stroke="rgba(255,255,255,0.55)" strokeWidth="1.4" fill={accent}/>
          {/* Dashed perforation line */}
          <line x1="9" y1="15" x2="29" y2="15" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" strokeDasharray="2 2"/>
          {/* Basketball */}
          <circle cx="10" cy="15" r="8" fill="white"/>
          {/* Basketball seam lines */}
          <path d="M2.5 15 Q10 9.5 17.5 15" stroke="rgba(0,0,0,0.22)" strokeWidth="0.9" fill="none"/>
          <path d="M2.5 15 Q10 20.5 17.5 15" stroke="rgba(0,0,0,0.22)" strokeWidth="0.9" fill="none"/>
          <line x1="10" y1="7" x2="10" y2="23" stroke="rgba(0,0,0,0.22)" strokeWidth="0.9"/>
          {/* Speed lines */}
          <line x1="20" y1="10" x2="26" y2="10" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="19.5" y1="14" x2="27" y2="14" stroke="rgba(255,255,255,0.45)" strokeWidth="1" strokeLinecap="round"/>
          <line x1="19.5" y1="16" x2="27" y2="16" stroke="rgba(255,255,255,0.45)" strokeWidth="1" strokeLinecap="round"/>
          <line x1="20" y1="20" x2="26" y2="20" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 17, letterSpacing: '-0.3px' }}>Basket</span>
          <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 900, fontSize: 17, letterSpacing: '-0.3px' }}>Pass</span>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 8, color: 'rgba(255,255,255,0.6)', letterSpacing: '2px', textTransform: 'uppercase' }}>Carnet Digital</span>
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
                  <Camera size={20} style={{ color: '#fff', pointerEvents: 'none' }} />
                  <span style={{ fontSize: 9, color: '#fff', fontWeight: 500, pointerEvents: 'none' }}>Cambiar</span>
                </label>
                <label style={{ position: 'absolute', bottom: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.4)', overflow: 'hidden', zIndex: 20 }}>
                  <input type="file" accept="image/*" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) onAvatarChange(f); e.target.value = ''; }} />
                  <Camera size={13} style={{ color: '#fff', pointerEvents: 'none' }} />
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
                ['Posición',  player.position ?? '—'],
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
          <div style={{ width: 76, height: 76, background: `linear-gradient(135deg, ${accent} 0%, ${accent}BB 100%)`, borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 16px ${accent}40`, overflow: 'hidden', padding: club?.logo ? 4 : 0 }}>
            {club?.logo ? (
              <img
                data-club-logo
                src={club.logo}
                alt={club.name}
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              />
            ) : (
              <>
                <span style={{ color: '#fff', fontWeight: 900, fontSize: 22, lineHeight: 1, display: 'block' }}>{initials}</span>
                <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 7, letterSpacing: '1px', marginTop: 3, textTransform: 'uppercase', maxWidth: 66, textAlign: 'center', lineHeight: 1.2 }}>
                  {club?.name?.slice(0, 10) ?? 'Club'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Verified */}
        <div style={{ background: '#fff', borderRadius: 8, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ width: 30, height: 30, background: '#1A2542', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShieldCheck size={15} style={{ color: '#fff' }} />
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
            {stats.map(({ Icon, label, value, color }) => (
              <div key={label} style={{ textAlign: 'center', background: '#fff', borderRadius: 8, padding: '8px 4px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <Icon size={14} style={{ color: accent, display: 'block', margin: '0 auto 4px' }} />
                <p style={{ fontSize: 6.5, color: '#8896B0', margin: '0 0 2px', letterSpacing: '0.3px', lineHeight: 1.2 }}>{label}</p>
                <p style={{ fontSize: 11, fontWeight: 700, color, margin: 0, lineHeight: 1 }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ background: '#0D1530', padding: '12px 16px' }}>
        <p style={{ color: accent, fontWeight: 900, fontSize: 15, lineHeight: 1.15, margin: 0, letterSpacing: '-0.2px' }}>
          TU PASIÓN.<br />TU CARNET.<br />TU JUEGO.
        </p>
      </div>

    </div>
  );
}
