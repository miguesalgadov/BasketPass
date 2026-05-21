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

const createSchema = z.object({
  firstName:    z.string().min(1, 'Requerido').max(50),
  lastName:     z.string().min(1, 'Requerido').max(50),
  email:        z.string().email('Email inválido'),
  phone:        z.string().optional(),
  rut:          z.string().optional(),
  teamId:       z.string().optional(),
  jerseyNumber: z.coerce.number().int().min(0).max(99).optional().or(z.literal('')),
  position:     z.enum(['PG','SG','SF','PF','C','']).optional(),
  clothingSize: z.string().max(10).optional(),
  birthDate:    z.string().optional(),
  height:       z.coerce.number().min(100).max(250).optional().or(z.literal('')),
  weight:       z.coerce.number().min(20).max(200).optional().or(z.literal('')),
});

const editSchema = createSchema.omit({ email: true });

type CreateForm = z.infer<typeof createSchema>;
type EditForm   = z.infer<typeof editSchema>;

interface Team { id: string; name: string; category: string; }

interface Player {
  id: string;
  jerseyNumber?: number;
  position?: string;
  birthDate?: string;
  height?: number;
  weight?: number;
  clothingSize?: string;
  teamId?: string;
  user: { firstName: string; lastName: string; email: string; phone?: string; rut?: string };
}

interface PlayerModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  player?: Player | null;
}

const POSITIONS = [
  { value: 'PG', label: 'Base (PG)' },
  { value: 'SG', label: 'Escolta (SG)' },
  { value: 'SF', label: 'Alero (SF)' },
  { value: 'PF', label: 'Ala-Pívot (PF)' },
  { value: 'C',  label: 'Pívot (C)' },
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

export function PlayerModal({ open, onClose, onSuccess, player }: PlayerModalProps) {
  const isEdit = Boolean(player);
  const [teams, setTeams] = useState<Team[]>([]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateForm>({
    resolver: zodResolver(isEdit ? (editSchema as any) : createSchema),
  });

  useEffect(() => {
    api.get('/teams').then((r) => setTeams(r.data.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (open) {
      reset(player ? {
        firstName:    player.user.firstName,
        lastName:     player.user.lastName,
        email:        player.user.email,
        phone:        player.user.phone ?? '',
        rut:          player.user.rut ?? '',
        teamId:       player.teamId ?? '',
        jerseyNumber: player.jerseyNumber ?? '',
        position:     (player.position as any) ?? '',
        clothingSize: player.clothingSize ?? '',
        birthDate:    player.birthDate ? player.birthDate.split('T')[0] : '',
        height:       player.height ?? '',
        weight:       player.weight ?? '',
      } : {
        firstName: '', lastName: '', email: '', phone: '', rut: '',
        teamId: '', jerseyNumber: '', position: '', clothingSize: '', birthDate: '', height: '', weight: '',
      });
    }
  }, [open, player, reset]);

  const onSubmit = async (data: CreateForm) => {
    const payload = {
      ...data,
      jerseyNumber: data.jerseyNumber === '' ? undefined : Number(data.jerseyNumber),
      height:       data.height === '' ? undefined : Number(data.height),
      weight:       data.weight === '' ? undefined : Number(data.weight),
      position:     data.position === '' ? undefined : data.position,
      teamId:       data.teamId === '' ? undefined : data.teamId,
      clothingSize: data.clothingSize === '' ? undefined : data.clothingSize,
      rut:          data.rut === '' ? undefined : data.rut,
      birthDate:    data.birthDate ? new Date(data.birthDate).toISOString() : undefined,
    };

    try {
      if (isEdit) {
        const { email: _e, ...editPayload } = payload as any;
        await api.patch(`/players/${player!.id}`, editPayload);
        toast.success('Jugador actualizado');
      } else {
        await api.post('/players', payload);
        toast.success('Jugador creado');
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
          <DialogTitle>{isEdit ? 'Editar jugador' : 'Nuevo jugador'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modificá los datos del jugador.' : 'Completá los datos para registrar un nuevo jugador.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre" error={errors.firstName?.message}>
              <input {...register('firstName')} className={inputClass} placeholder="Juan" />
            </Field>
            <Field label="Apellido" error={errors.lastName?.message}>
              <input {...register('lastName')} className={inputClass} placeholder="García" />
            </Field>
          </div>

          {!isEdit && (
            <Field label="Email" error={errors.email?.message}>
              <input {...register('email')} type="email" className={inputClass} placeholder="jugador@club.com" />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Teléfono" error={errors.phone?.message}>
              <input {...register('phone')} className={inputClass} placeholder="+56 9 1234 5678" />
            </Field>
            <Field label="RUT" error={errors.rut?.message}>
              <input {...register('rut')} className={inputClass} placeholder="15.628.327-4" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Equipo">
              <select {...register('teamId')} className={inputClass}>
                <option value="">Sin equipo</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} — {t.category}</option>
                ))}
              </select>
            </Field>
            <Field label="Posición">
              <select {...register('position')} className={inputClass}>
                <option value="">Sin posición</option>
                {POSITIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="# Camiseta" error={errors.jerseyNumber?.message}>
              <input {...register('jerseyNumber')} type="number" min="0" max="99" className={inputClass} placeholder="10" />
            </Field>
            <Field label="Talla" error={errors.clothingSize?.message}>
              <select {...register('clothingSize')} className={inputClass}>
                <option value="">Sin talla</option>
                {['XS','S','M','L','XL','XXL','XXXL'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Fecha de nacimiento">
              <input {...register('birthDate')} type="date" className={inputClass} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Altura (cm)" error={errors.height?.message}>
              <input {...register('height')} type="number" className={inputClass} placeholder="185" />
            </Field>
            <Field label="Peso (kg)" error={errors.weight?.message}>
              <input {...register('weight')} type="number" className={inputClass} placeholder="80" />
            </Field>
          </div>

          <DialogFooter>
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-secondary border border-border rounded-lg hover:bg-muted transition">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary hover:bg-primary-600 text-white rounded-lg transition disabled:opacity-60">
              {isSubmitting && <Loader2 size={15} className="animate-spin" />}
              {isEdit ? 'Guardar cambios' : 'Crear jugador'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
