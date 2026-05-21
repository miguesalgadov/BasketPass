'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivityEvent } from './UpcomingActivities';

const MONTHS_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export function MiniCalendar({ events }: { events: ActivityEvent[] }) {
  const [current, setCurrent] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const year = current.getFullYear();
  const month = current.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();
  const startOffset = startDay === 0 ? 6 : startDay - 1;

  const today = new Date();

  const matchDays = new Set(
    events.filter((e) => e.type === 'MATCH' && new Date(e.date).getMonth() === month && new Date(e.date).getFullYear() === year)
      .map((e) => new Date(e.date).getDate())
  );
  const trainingDays = new Set(
    events.filter((e) => e.type === 'TRAINING' && new Date(e.date).getMonth() === month && new Date(e.date).getFullYear() === year)
      .map((e) => new Date(e.date).getDate())
  );

  return (
    <div className="rounded-xl border border-white/8 bg-[#181C25] px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-white capitalize">
          {MONTHS_FULL[month]} {year}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => setCurrent(new Date(year, month - 1, 1))}
            className="text-white/40 hover:text-white px-1 py-0.5 rounded transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => setCurrent(new Date(year, month + 1, 1))}
            className="text-white/40 hover:text-white px-1 py-0.5 rounded transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {['Lu','Ma','Mi','Ju','Vi','Sá','Do'].map((d) => (
          <div key={d} className="text-center text-[9px] text-white/30 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {Array(startOffset).fill(null).map((_, i) => (
          <div key={`pre-${i}`} className="text-center text-[11px] text-white/15 py-1.5">
            {new Date(year, month, -(startOffset - i - 1)).getDate()}
          </div>
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
          const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const hasMatch = matchDays.has(d);
          const hasTraining = trainingDays.has(d);
          return (
            <div key={d} className="relative flex flex-col items-center">
              <div className={cn(
                'w-6 h-6 flex items-center justify-center text-[11px] rounded-full cursor-default transition-colors',
                isToday ? 'bg-orange-500 text-white font-bold' : 'text-white/50 hover:bg-white/8 hover:text-white'
              )}>
                {d}
              </div>
              {(hasMatch || hasTraining) && !isToday && (
                <div className={cn(
                  'w-1 h-1 rounded-full mt-0.5',
                  hasMatch ? 'bg-orange-500' : 'bg-sky-400'
                )} />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-4 mt-3 pt-2 border-t border-white/8">
        <span className="flex items-center gap-1.5 text-[10px] text-white/40">
          <span className="w-2 h-2 rounded-full bg-orange-500" /> Partido
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-white/40">
          <span className="w-2 h-2 rounded-full bg-sky-400" /> Entrenamiento
        </span>
      </div>
    </div>
  );
}
