'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, RepeatIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const trainingSchema = z.object({
  teamId:            z.string().min(1, 'Requerido'),
  date:              z.string().min(1, 'Requerido'),
  time:              z.string().min(1, 'Requerido'),
  duration:          z.coerce.number().int().min(15).max(300),
  location:          z.string().optional(),
  plan:              z.string().optional(),
  coachNotes:        z.string().optional(),
});

type TrainingForm = z.infer<typeof trainingSchema>;

interface Team { id: string; name: string; category: string; }

export interface Training {
  id: string;
  teamId: string;
  date: string;
  duration: number;
  location?: string;
  plan?: string;
  coachNotes?: string;
  recurrenceGroupId?: string;
  team?: { id: string; name: string; category: string };
}

interface Props {
  open:      boolean;
  onClose:   () => void;
  onSuccess: () => void;
  training?: Training | null;
}

const DAYS = [
  { label: 'Dom', value: 0 },
  { label: 'Lun', value: 1 },
  { label: 'Mar', value: 2 },
  { label: 'Mié', value: 3 },
  { label: 'Jue', value: 4 },
  { label: 'Vie', value: 5 },
  { label: 'Sáb', value: 6 },
];

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-secondary mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}

const inputClass = 'w-full px-3 py-2 border border-border rounded-lg bg-surface text-secondary text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition';

export function TrainingModal({ open, onClose, onSuccess, training }: Props) {
  const isEdit = Boolean(training);
  const [teams, setTeams]               = useState<Team[]>([]);
  const [recurrent, setRecurrent]       = useState(false);
  const [daysOfWeek, setDaysOfWeek]     = useState<number[]>([]);
  const [endDate, setEndDate]           = useState('');
  const [daysError, setDaysError]       = useState('');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TrainingForm>({
    resolver: zodResolver(trainingSchema),
  });

  useEffect(() => {
    api.get('/teams').then((r) => setTeams(r.data.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (open) {
      setRecurrent(false);
      setDaysOfWeek([]);
      setEndDate('');
      setDaysError('');
      if (training) {
        const d = new Date(training.date);
        reset({
          teamId:    training.teamId,
          date:      d.toISOString().split('T')[0],
          time:      d.toTimeString().slice(0, 5),
          duration:  training.duration,
          location:  training.location ?? '',
          plan:      training.plan ?? '',
          coachNotes: training.coachNotes ?? '',
        });
      } else {
        reset({ teamId: '', date: '', time: '18:00', duration: 90, location: '', plan: '', coachNotes: '' });
      }
    }
  }, [open, training, reset]);

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const onSubmit = async (data: TrainingForm) => {
    if (recurrent && !isEdit) {
      if (daysOfWeek.length === 0) { setDaysError('Seleccioná al menos un día'); return; }
      if (!endDate)                 { setDaysError('Ingresá la fecha de fin'); return; }
      if (endDate <= data.date)     { setDaysError('La fecha de fin debe ser posterior al inicio'); return; }
    }
    setDaysError('');

    const datetime = new Date(`${data.date}T${data.time}:00`).toISOString();
    const payload: Record<string, unknown> = {
      teamId:    data.teamId,
      date:      datetime,
      duration:  Number(data.duration),
      location:  data.location  || undefined,
      plan:      data.plan      || undefined,
      coachNotes: data.coachNotes || undefined,
    };

    if (recurrent && !isEdit) {
      payload.recurrent         = true;
      payload.daysOfWeek        = daysOfWeek;
      payload.localDate         = data.date;
      payload.recurrenceEndDate = endDate;
    }

    try {
      if (isEdit) {
        await api.patch(`/trainings/${training!.id}`, payload);
        toast.success('Entrenamiento actualizado');
      } else {
        const res = await api.post('/trainings', payload);
        const { count } = res.data.data;
        toast.success(count === 1
          ? 'Entrenamiento creado'
          : `${count} entrenamientos creados (serie semanal)`
        );
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Error al guardar');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar entrenamiento' : 'Nuevo entrenamiento'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modificá los datos del entrenamiento.' : 'Programá una sesión única o una serie semanal recurrente.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          <Field label="Equipo" error={errors.teamId?.message}>
            <select {...register('teamId')} className={inputClass}>
              <option value="">Seleccionar...</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.category}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Field label={recurrent ? 'Fecha de inicio' : 'Fecha'} error={errors.date?.message}>
                <input {...register('date')} type="date" className={inputClass} />
              </Field>
            </div>
            <Field label="Hora" error={errors.time?.message}>
              <input {...register('time')} type="time" className={inputClass} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Duración (min)" error={errors.duration?.message}>
              <input {...register('duration')} type="number" min="15" max="300" className={inputClass} placeholder="90" />
            </Field>
            <Field label="Lugar">
              <input {...register('location')} className={inputClass} placeholder="Gimnasio" />
            </Field>
          </div>

          <Field label="Plan de entrenamiento">
            <textarea {...register('plan')} rows={2} className={inputClass} placeholder="Ejercicios, objetivos..." />
          </Field>

          <Field label="Notas del entrenador">
            <textarea {...register('coachNotes')} rows={2} className={inputClass} placeholder="Observaciones..." />
          </Field>

          {/* ── Recurrencia (solo al crear) ─────────────────────────── */}
          {!isEdit && (
            <div className="border border-border rounded-xl overflow-hidden">
              {/* Toggle header */}
              <button
                type="button"
                onClick={() => setRecurrent((v) => !v)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition',
                  recurrent ? 'bg-primary/10 text-primary' : 'bg-muted/40 text-secondary hover:bg-muted/60'
                )}
              >
                <span className="flex items-center gap-2">
                  <RepeatIcon size={15} />
                  Entrenamiento recurrente (semanal)
                </span>
                <span className={cn(
                  'w-9 h-5 rounded-full transition-colors relative',
                  recurrent ? 'bg-primary' : 'bg-border'
                )}>
                  <span className={cn(
                    'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all',
                    recurrent ? 'left-4' : 'left-0.5'
                  )} />
                </span>
              </button>

              {/* Opciones de recurrencia */}
              {recurrent && (
                <div className="px-4 py-4 space-y-4 bg-surface">
                  <div>
                    <p className="text-xs font-medium text-secondary mb-2">Días de la semana</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {DAYS.map((d) => (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => toggleDay(d.value)}
                          className={cn(
                            'w-10 h-10 rounded-lg text-xs font-semibold border transition',
                            daysOfWeek.includes(d.value)
                              ? 'bg-primary text-white border-primary'
                              : 'bg-muted text-muted-foreground border-border hover:border-primary hover:text-primary'
                          )}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Repetir hasta</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  {daysError && (
                    <p className="text-xs text-danger font-medium">{daysError}</p>
                  )}

                  {/* Preview de cantidad de sesiones */}
                  {daysOfWeek.length > 0 && endDate && (
                    <RecurrencePreview daysOfWeek={daysOfWeek} endDate={endDate} />
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-secondary border border-border rounded-lg hover:bg-muted transition">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary hover:bg-primary-600 text-white rounded-lg transition disabled:opacity-60">
              {isSubmitting && <Loader2 size={15} className="animate-spin" />}
              {isEdit ? 'Guardar cambios' : recurrent ? 'Crear serie' : 'Crear entrenamiento'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Muestra cuántas sesiones se generarán
function RecurrencePreview({ daysOfWeek, endDate }: { daysOfWeek: number[]; endDate: string }) {
  const count = (() => {
    const end = new Date(endDate);
    const start = new Date();
    let n = 0;
    const cursor = new Date(start);
    while (cursor <= end && n < 500) {
      if (daysOfWeek.includes(cursor.getDay())) n++;
      cursor.setDate(cursor.getDate() + 1);
    }
    return n;
  })();

  if (count === 0) return null;
  return (
    <p className="text-xs text-success font-medium">
      ✓ Se generarán <strong>{count}</strong> sesión{count !== 1 ? 'es' : ''} hasta el{' '}
      {new Date(endDate).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}
    </p>
  );
}
