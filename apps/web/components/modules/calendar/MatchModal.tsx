'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';

const matchSchema = z.object({
  teamId:    z.string().min(1, 'Requerido'),
  opponent:  z.string().min(1, 'Requerido').max(100),
  date:      z.string().min(1, 'Requerido'),
  time:      z.string().min(1, 'Requerido'),
  location:  z.string().optional(),
  isHome:    z.boolean().default(true),
  notes:     z.string().optional(),
  status:    z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']).optional(),
  scoreHome: z.coerce.number().int().min(0).optional().or(z.literal('')),
  scoreAway: z.coerce.number().int().min(0).optional().or(z.literal('')),
});

type MatchForm = z.infer<typeof matchSchema>;

interface Team { id: string; name: string; category: string; }

export interface Match {
  id: string;
  teamId: string;
  opponent: string;
  date: string;
  location?: string;
  isHome: boolean;
  scoreHome?: number;
  scoreAway?: number;
  status: string;
  notes?: string;
  team?: { id: string; name: string; category: string };
}

interface MatchModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  match?: Match | null;
}

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

export function MatchModal({ open, onClose, onSuccess, match }: MatchModalProps) {
  const isEdit = Boolean(match);
  const [teams, setTeams] = useState<Team[]>([]);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<MatchForm>({
    resolver: zodResolver(matchSchema),
  });

  const status = watch('status');

  useEffect(() => {
    api.get('/teams').then((r) => setTeams(r.data.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (open) {
      if (match) {
        const d = new Date(match.date);
        reset({
          teamId:    match.teamId,
          opponent:  match.opponent,
          date:      d.toISOString().split('T')[0],
          time:      d.toTimeString().slice(0, 5),
          location:  match.location ?? '',
          isHome:    match.isHome,
          notes:     match.notes ?? '',
          status:    match.status as any,
          scoreHome: match.scoreHome ?? '',
          scoreAway: match.scoreAway ?? '',
        });
      } else {
        reset({ teamId: '', opponent: '', date: '', time: '19:00', location: '', isHome: true, notes: '', status: 'SCHEDULED', scoreHome: '', scoreAway: '' });
      }
    }
  }, [open, match, reset]);

  const onSubmit = async (data: MatchForm) => {
    const datetime = new Date(`${data.date}T${data.time}:00`).toISOString();
    const payload = {
      teamId:    data.teamId,
      opponent:  data.opponent,
      date:      datetime,
      location:  data.location || undefined,
      isHome:    data.isHome,
      notes:     data.notes || undefined,
      status:    data.status,
      scoreHome: data.scoreHome === '' ? undefined : Number(data.scoreHome),
      scoreAway: data.scoreAway === '' ? undefined : Number(data.scoreAway),
    };
    try {
      if (isEdit) {
        await api.patch(`/matches/${match!.id}`, payload);
        toast.success('Partido actualizado');
      } else {
        await api.post('/matches', payload);
        toast.success('Partido creado');
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
          <DialogTitle>{isEdit ? 'Editar partido' : 'Nuevo partido'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modificá los datos del partido.' : 'Programá un nuevo partido.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Equipo" error={errors.teamId?.message}>
              <select {...register('teamId')} className={inputClass}>
                <option value="">Seleccionar...</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.category}</option>)}
              </select>
            </Field>
            <Field label="Rival" error={errors.opponent?.message}>
              <input {...register('opponent')} className={inputClass} placeholder="Club Rival" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha" error={errors.date?.message}>
              <input {...register('date')} type="date" className={inputClass} />
            </Field>
            <Field label="Hora" error={errors.time?.message}>
              <input {...register('time')} type="time" className={inputClass} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Lugar">
              <input {...register('location')} className={inputClass} placeholder="Gimnasio / Dirección" />
            </Field>
            <Field label="Condición">
              <select {...register('isHome', { setValueAs: (v) => v === 'true' || v === true })} className={inputClass}>
                <option value="true">Local</option>
                <option value="false">Visitante</option>
              </select>
            </Field>
          </div>

          {isEdit && (
            <>
              <Field label="Estado">
                <select {...register('status')} className={inputClass}>
                  <option value="SCHEDULED">Programado</option>
                  <option value="COMPLETED">Finalizado</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>
              </Field>

              {status === 'COMPLETED' && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Puntos locales" error={errors.scoreHome?.message}>
                    <input {...register('scoreHome')} type="number" min="0" className={inputClass} placeholder="0" />
                  </Field>
                  <Field label="Puntos visitante" error={errors.scoreAway?.message}>
                    <input {...register('scoreAway')} type="number" min="0" className={inputClass} placeholder="0" />
                  </Field>
                </div>
              )}
            </>
          )}

          <Field label="Notas">
            <textarea {...register('notes')} rows={2} className={inputClass} placeholder="Observaciones..." />
          </Field>

          <DialogFooter>
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-secondary border border-border rounded-lg hover:bg-muted transition">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary hover:bg-primary-600 text-white rounded-lg transition disabled:opacity-60">
              {isSubmitting && <Loader2 size={15} className="animate-spin" />}
              {isEdit ? 'Guardar cambios' : 'Crear partido'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
