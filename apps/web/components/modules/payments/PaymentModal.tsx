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

const paymentSchema = z.object({
  playerId:  z.string().optional(),
  concept:   z.string().min(1, 'Requerido').max(200),
  amount:    z.coerce.number().positive('Debe ser mayor a 0'),
  currency:  z.string().default('ARS'),
  dueDate:   z.string().optional(),
});

type PaymentForm = z.infer<typeof paymentSchema>;

interface Player {
  id: string;
  user: { firstName: string; lastName: string };
  team?: { name: string };
}

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
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

const COMMON_CONCEPTS = [
  'Cuota mensual', 'Cuota anual', 'Inscripción', 'Ropa deportiva',
  'Viaje / traslado', 'Torneo', 'Equipamiento',
];

export function PaymentModal({ open, onClose, onSuccess }: PaymentModalProps) {
  const [players, setPlayers] = useState<Player[]>([]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { currency: 'ARS' },
  });

  useEffect(() => {
    api.get('/players', { params: { limit: 100 } })
      .then((r) => setPlayers(r.data.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open) reset({ playerId: '', concept: '', amount: undefined as any, currency: 'ARS', dueDate: '' });
  }, [open, reset]);

  const onSubmit = async (data: PaymentForm) => {
    const payload = {
      ...data,
      playerId: data.playerId || undefined,
      dueDate:  data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
    };
    try {
      await api.post('/payments', payload);
      toast.success('Cobro registrado');
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
          <DialogTitle>Nuevo cobro</DialogTitle>
          <DialogDescription>Registrá un pago o cuota pendiente.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          <Field label="Jugador (opcional)">
            <select {...register('playerId')} className={inputClass}>
              <option value="">— General (sin jugador) —</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.user.firstName} {p.user.lastName}{p.team ? ` · ${p.team.name}` : ''}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Concepto" error={errors.concept?.message}>
            <input
              {...register('concept')}
              list="concepts-list"
              className={inputClass}
              placeholder="Ej: Cuota mensual mayo"
            />
            <datalist id="concepts-list">
              {COMMON_CONCEPTS.map((c) => <option key={c} value={c} />)}
            </datalist>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto" error={errors.amount?.message}>
              <input
                {...register('amount')}
                type="number"
                min="1"
                step="0.01"
                className={inputClass}
                placeholder="5000"
              />
            </Field>
            <Field label="Moneda">
              <select {...register('currency')} className={inputClass}>
                <option value="ARS">ARS — Peso argentino</option>
                <option value="USD">USD — Dólar</option>
              </select>
            </Field>
          </div>

          <Field label="Fecha de vencimiento">
            <input {...register('dueDate')} type="date" className={inputClass} />
          </Field>

          <DialogFooter>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-secondary border border-border rounded-lg hover:bg-muted transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary hover:bg-primary-600 text-white rounded-lg transition disabled:opacity-60"
            >
              {isSubmitting && <Loader2 size={15} className="animate-spin" />}
              Registrar cobro
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
