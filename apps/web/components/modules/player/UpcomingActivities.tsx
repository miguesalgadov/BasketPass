'use client';

import Link from 'next/link';

export interface ActivityEvent {
  id: string;
  type: 'MATCH' | 'TRAINING';
  date: string;
  title: string;
  location?: string | null;
  isHome?: boolean | null;
}

const TYPE_CONFIG = {
  MATCH:    { icon: '🏀', label: 'Partido',   dotColor: '#F97316', badgeBg: 'bg-orange-500/15', badgeText: 'text-orange-400' },
  TRAINING: { icon: '💪', label: 'Entrena.',  dotColor: '#38BDF8', badgeBg: 'bg-sky-400/15',    badgeText: 'text-sky-300'   },
};

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

export function UpcomingActivities({ events }: { events: ActivityEvent[] }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#181C25] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <span className="text-sm font-semibold text-white">Próximas actividades</span>
        <Link href="/player/calendar" className="text-[11px] text-orange-400 hover:text-orange-300 transition">
          Ver calendario →
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="px-4 py-6 text-center text-white/30 text-sm">
          No hay actividades programadas en los próximos 14 días
        </div>
      ) : (
        events.map((event) => {
          const cfg = TYPE_CONFIG[event.type];
          const d = new Date(event.date);
          return (
            <div
              key={event.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-b-0 hover:bg-white/3 transition-colors"
            >
              <div className="text-center min-w-[32px]">
                <div className="text-lg font-black text-orange-400 leading-none">{d.getDate()}</div>
                <div className="text-[9px] text-white/40 uppercase">{MONTHS_SHORT[d.getMonth()]}</div>
              </div>

              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.dotColor }} />

              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white truncate">
                  {cfg.icon} {event.title}
                </p>
                <p className="text-[11px] text-white/40 mt-0.5">
                  {event.location ? `📍 ${event.location} · ` : ''}{fmt(event.date)}
                  {event.type === 'MATCH' && (event.isHome ? ' · Local' : ' · Visita')}
                </p>
              </div>

              <span className={`text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-wide flex-shrink-0 ${cfg.badgeBg} ${cfg.badgeText}`}>
                {cfg.label}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
