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

const teamSchema = z.object({
  name:     z.string().min(1, 'Requerido').max(100),
  category: z.string().min(1, 'Requerido').max(50),
  season:   z.string().min(4, 'Requerido').max(20),
  coachId:  z.string().optional(),
});

type TeamForm = z.infer<typeof teamSchema>;

interface Coach { id: string; firstName: string; lastName: string; }

export interface Team {
  id: string;
  name: string;
  category: string;
  season: string;
  coachId?: string;
  coach?: { id: string; firstName: string; lastName: string };
  _count?: { players: number };
}

interface TeamModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  team?: Team | null;
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

const CATEGORIES = [
  'Mini', 'Infantil', 'Cadete', 'Junior', 'U18', 'U20', 'Senior',
];

export function TeamModal({ open, onClose, onSuccess, team }: TeamModalProps) {
  const isEdit = Boolean(team);
  const [coaches, setCoaches] = useState<Coach[]>([]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TeamForm>({
    resolver: zodResolver(teamSchema),
  });

  useEffect(() => {
    api.get('/teams/coaches').then((r) => setCoaches(r.data.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (open) {
      reset(team ? {
        name:     team.name,
        category: team.category,
        season:   team.season,
        coachId:  team.coachId ?? team.coach?.id ?? '',
      } : {
        name: '', category: '', season: new Date().getFullYear().toString(), coachId: '',
      });
    }
  }, [open, team, reset]);

  const onSubmit = async (data: TeamForm) => {
    const payload = {
      ...data,
      coachId: data.coachId || undefined,
    };
    try {
      if (isEdit) {
        await api.patch(`/teams/${team!.id}`, payload);
        toast.success('Equipo actualizado');
      } else {
        await api.post('/teams', payload);
        toast.success('Equipo creado');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Error al guardar');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar equipo' : 'Nuevo equipo'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modificá los datos del equipo.' : 'Completá los datos para registrar un nuevo equipo.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          <Field label="Nombre del equipo" error={errors.name?.message}>
            <input {...register('name')} className={inputClass} placeholder="Ej: Plantel Mayor" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoría" error={errors.category?.message}>
              <select {...register('category')} className={inputClass}>
                <option value="">Seleccionar...</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Temporada" error={errors.season?.message}>
              <input {...register('season')} className={inputClass} placeholder="2025" />
            </Field>
          </div>

          <Field label="Entrenador">
            <select {...register('coachId')} className={inputClass}>
              <option value="">Sin entrenador asignado</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
              ))}
            </select>
          </Field>

          <DialogFooter>
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-secondary border border-border rounded-lg hover:bg-muted transition">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary hover:bg-primary-600 text-white rounded-lg transition disabled:opacity-60">
              {isSubmitting && <Loader2 size={15} className="animate-spin" />}
              {isEdit ? 'Guardar cambios' : 'Crear equipo'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
