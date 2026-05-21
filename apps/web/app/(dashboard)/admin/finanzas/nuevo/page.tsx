'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Paperclip, X, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

const INCOME_CATEGORIES = [
  { value: 'MONTHLY_FEE',    label: 'Cuota mensual' },
  { value: 'REGISTRATION',   label: 'Inscripción de jugador' },
  { value: 'TOURNAMENT_FEE', label: 'Inscripción a torneo (recibida)' },
  { value: 'SPONSORSHIP',    label: 'Auspicio / Publicidad' },
  { value: 'DONATION',       label: 'Donación' },
  { value: 'SUBSIDY',        label: 'Subvención / Aporte municipal' },
  { value: 'OTHER_INCOME',   label: 'Otro ingreso' },
];

const EXPENSE_CATEGORIES = [
  { value: 'VENUE_RENTAL',     label: '🏟 Arriendo de cancha' },
  { value: 'EQUIPMENT',        label: '👕 Equipamiento y uniformes' },
  { value: 'TRANSPORT',        label: '🚌 Transporte' },
  { value: 'REFEREE',          label: '🏀 Arbitraje' },
  { value: 'TOURNAMENT_ENTRY', label: '🏆 Inscripción a campeonato' },
  { value: 'COACH_FEE',        label: '👨‍🏫 Honorarios entrenador' },
  { value: 'MEDICAL',          label: '🏥 Gastos médicos / kinesiología' },
  { value: 'CLEANING',         label: '🧹 Útiles de aseo' },
  { value: 'ADMIN',            label: '📋 Gastos administrativos' },
  { value: 'OTHER_EXPENSE',    label: 'Otro egreso' },
];

interface FilePreview { file: File; preview: string | null }

export default function NuevoMovimientoPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [type, setType]     = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [files, setFiles]   = useState<FilePreview[]>([]);
  const [loading, setLoading] = useState(false);

  const categories = type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    const valid = selected.filter(f =>
      ['image/jpeg','image/png','image/webp','application/pdf'].includes(f.type) && f.size <= 10 * 1024 * 1024
    );
    if (valid.length < selected.length) toast.error('Solo JPG, PNG, WebP y PDF hasta 10MB');

    valid.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = e => setFiles(prev => [...prev, { file, preview: e.target?.result as string }]);
        reader.readAsDataURL(file);
      } else {
        setFiles(prev => [...prev, { file, preview: null }]);
      }
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeFile(i: number) {
    setFiles(prev => prev.filter((_, j) => j !== i));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const body = {
      type,
      amount:          fd.get('amount'),
      date:            new Date(fd.get('date') as string).toISOString(),
      concept:         fd.get('concept'),
      description:     fd.get('description') || undefined,
      category:        fd.get('category'),
      paymentMethod:   fd.get('paymentMethod') || undefined,
      referenceNumber: fd.get('referenceNumber') || undefined,
    };

    try {
      // 1. Create transaction
      const res = await api.post('/finanzas/transactions', body);
      const txId = res.data.data.id;

      // 2. Upload evidence files
      for (const { file } of files) {
        try {
          const form = new FormData();
          form.append('file', file);
          await api.post(`/finanzas/transactions/${txId}/evidence`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch {
          toast.error(`Error subiendo ${file.name}`);
        }
      }

      toast.success('Movimiento registrado');
      router.push('/admin/finanzas/movimientos');
    } catch {
      toast.error('Error al guardar el movimiento');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Type toggle */}
        <div className="flex rounded-xl overflow-hidden border border-border">
          <button type="button" onClick={() => setType('INCOME')}
            className={cn(
              'flex-1 py-3 text-sm font-semibold transition',
              type === 'INCOME' ? 'bg-emerald-500 text-white' : 'bg-white text-muted-foreground hover:bg-muted/30',
            )}>
            ↑ Ingreso
          </button>
          <button type="button" onClick={() => setType('EXPENSE')}
            className={cn(
              'flex-1 py-3 text-sm font-semibold transition',
              type === 'EXPENSE' ? 'bg-red-500 text-white' : 'bg-white text-muted-foreground hover:bg-muted/30',
            )}>
            ↓ Egreso
          </button>
        </div>

        <div className="bg-white rounded-xl border border-border p-5 shadow-sm space-y-4">
          {/* Concept */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Concepto *</label>
            <input name="concept" type="text" required
              placeholder={type === 'INCOME' ? 'ej: Auspicio Deportes Bío' : 'ej: Arriendo Gimnasio Central Mayo'}
              className="w-full px-3 py-2.5 rounded-lg border border-border text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Amount */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Monto (CLP) *</label>
              <input name="amount" type="number" min="1" step="1" required
                placeholder="0"
                className="w-full px-3 py-2.5 rounded-lg border border-border text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Date */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Fecha *</label>
              <input name="date" type="date" required
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2.5 rounded-lg border border-border text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Categoría *</label>
              <select name="category" required
                className="w-full px-3 py-2.5 rounded-lg border border-border text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">— Seleccionar —</option>
                {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            {/* Payment method */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Método / Cuenta</label>
              <select name="paymentMethod"
                className="w-full px-3 py-2.5 rounded-lg border border-border text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">— Seleccionar —</option>
                <option value="Cuenta corriente">Cuenta corriente</option>
                <option value="Caja chica">Caja chica</option>
                <option value="MercadoPago">MercadoPago</option>
                <option value="Transferencia">Transferencia bancaria</option>
                <option value="Efectivo">Efectivo</option>
              </select>
            </div>
          </div>

          {/* Reference */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">N° boleta / comprobante</label>
            <input name="referenceNumber" type="text" placeholder="ej: 001234"
              className="w-full px-3 py-2.5 rounded-lg border border-border text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Descripción adicional</label>
            <textarea name="description" rows={2} placeholder="Notas opcionales..."
              className="w-full px-3 py-2.5 rounded-lg border border-border text-secondary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Evidence upload */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Evidencia de respaldo
            <span className="font-normal ml-1">(boleta, comprobante, captura)</span>
          </label>

          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-border rounded-xl p-5 text-center hover:border-primary/50 hover:bg-primary/5 transition">
            <Paperclip size={20} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Haz clic para adjuntar archivos</p>
            <p className="text-xs text-muted-foreground/60 mt-1">PNG, JPG, PDF — máx. 10MB por archivo</p>
          </button>
          <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />

          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {files.map(({ file, preview }, i) => (
                <div key={i}
                  className="relative w-16 h-16 rounded-lg border border-border bg-muted overflow-hidden group flex-shrink-0">
                  {preview
                    ? <img src={preview} alt={file.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                        <span className="text-xl">📄</span>
                        <span className="text-[8px] text-muted-foreground px-1 truncate w-full text-center">{file.name}</span>
                      </div>
                  }
                  <button type="button" onClick={() => removeFile(i)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <button type="submit" disabled={loading}
          className={cn(
            'w-full py-3 rounded-xl text-sm font-semibold text-white transition disabled:opacity-60',
            type === 'INCOME' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600',
          )}>
          {loading ? 'Guardando...' : (
            <span className="flex items-center justify-center gap-2">
              <CheckCircle2 size={16} />
              Registrar {type === 'INCOME' ? 'ingreso' : 'egreso'}
            </span>
          )}
        </button>
      </form>
    </div>
  );
}
