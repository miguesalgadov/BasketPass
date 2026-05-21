'use client';

import { useState, useEffect } from 'react';
import { Loader2, CreditCard, Activity, UserX, Gift, Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { FeeData, FeeStatus, STATUS_CONFIG } from './FeeCell';

const MONTHS_ES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const METHODS = [
  { value: 'CASH',        label: 'Efectivo' },
  { value: 'TRANSFER',    label: 'Transferencia' },
  { value: 'MERCADOPAGO', label: 'MercadoPago' },
  { value: 'CHEQUE',      label: 'Cheque' },
  { value: 'OTHER',       label: 'Otro' },
];

interface DetailFee extends FeeData {
  feeType?: { name: string; currency: string };
  player?:  { firstName: string; lastName: string; jerseyNumber?: number | null };
  month?:   number;
  year?:    number;
  reminders?: { id: string; type: string; channel: string; sentAt: string; success: boolean }[];
}

interface Props {
  feeId:    string | null;
  onClose:  () => void;
  onUpdate: () => void;
}

const inputClass = 'w-full px-3 py-2 border border-border rounded-lg bg-surface text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary transition';

export function FeePaymentModal({ feeId, onClose, onUpdate }: Props) {
  const [fee, setFee]           = useState<DetailFee | null>(null);
  const [loading, setLoading]   = useState(false);
  const [tab, setTab]           = useState<'pay' | 'status' | 'history'>('pay');

  const [paidAmount, setPaidAmount]   = useState('');
  const [method, setMethod]           = useState('CASH');
  const [notes, setNotes]             = useState('');
  const [saving, setSaving]           = useState(false);

  const fetchFee = async (id: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/fees/${id}`);
      const f = res.data.data;
      setFee(f);
      setPaidAmount(String(f.paidAmount ?? f.amount ?? ''));
      setNotes(f.notes ?? '');
    } catch {
      toast.error('Error al cargar la cuota');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (feeId) { setTab('pay'); fetchFee(feeId); }
    else        { setFee(null); }
  }, [feeId]);

  const handlePay = async () => {
    if (!fee) return;
    setSaving(true);
    try {
      await api.post(`/fees/${fee.id}/pay`, {
        paidAmount: Number(paidAmount),
        paymentMethod: method,
        notes: notes || undefined,
      });
      toast.success('Pago registrado');
      onUpdate();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Error al registrar pago');
    } finally { setSaving(false); }
  };

  const markAs = async (action: 'mark-injured' | 'mark-exempt' | 'mark-not-enrolled') => {
    if (!fee) return;
    setSaving(true);
    try {
      await api.post(`/fees/${fee.id}/${action}`, { notes: notes || undefined });
      toast.success('Estado actualizado');
      onUpdate();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Error al actualizar');
    } finally { setSaving(false); }
  };

  const sendReminder = async () => {
    if (!fee) return;
    setSaving(true);
    try {
      await api.post(`/fees/${fee.id}/remind`);
      toast.success('Recordatorio enviado');
      fetchFee(fee.id);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Error al enviar recordatorio');
    } finally { setSaving(false); }
  };

  const cfg = fee ? (STATUS_CONFIG[fee.status as FeeStatus] ?? STATUS_CONFIG.PENDING) : null;

  return (
    <Dialog open={Boolean(feeId)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        {loading || !fee ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', cfg?.bg, cfg?.text)}>
                  {cfg?.label}
                </span>
                <span>
                  {fee.player?.lastName ?? ''}, {fee.player?.firstName ?? ''}
                  {fee.player?.jerseyNumber != null && <span className="text-muted-foreground text-sm ml-1">#{fee.player.jerseyNumber}</span>}
                </span>
              </DialogTitle>
              <DialogDescription>
                {fee.feeType?.name ?? 'Cuota'} · {MONTHS_ES[fee.month ?? 0]} {fee.year}
                · ${fee.amount.toLocaleString('es-CL')} {fee.feeType?.currency ?? ''}
              </DialogDescription>
            </DialogHeader>

            {/* Tabs */}
            <div className="flex gap-1 bg-muted p-1 rounded-lg mx-6">
              {([['pay', 'Pago'], ['status', 'Estado'], ['history', 'Historial']] as const).map(([k, l]) => (
                <button key={k} onClick={() => setTab(k)}
                  className={cn('flex-1 py-1 rounded-md text-xs font-medium transition',
                    tab === k ? 'bg-surface text-secondary shadow-sm' : 'text-muted-foreground hover:text-secondary'
                  )}>
                  {l}
                </button>
              ))}
            </div>

            <div className="px-6 pb-2 space-y-3">
              {/* ── Pay tab ── */}
              {tab === 'pay' && (
                <>
                  {fee.status === 'PAID' ? (
                    <div className="bg-success/10 border border-success/20 rounded-xl p-4 space-y-1 text-sm">
                      <p className="font-semibold text-success">Cuota pagada</p>
                      <p className="text-muted-foreground">
                        Monto: <strong>${(fee.paidAmount ?? fee.amount).toLocaleString('es-CL')}</strong>
                      </p>
                      {fee.paidAt && (
                        <p className="text-muted-foreground">
                          Fecha: <strong>{new Date(fee.paidAt).toLocaleDateString('es-CL')}</strong>
                        </p>
                      )}
                      {fee.paymentMethod && (
                        <p className="text-muted-foreground">
                          Método: <strong>{METHODS.find((m) => m.value === fee.paymentMethod)?.label ?? fee.paymentMethod}</strong>
                        </p>
                      )}
                      {fee.notes && <p className="text-muted-foreground text-xs">{fee.notes}</p>}
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-secondary mb-1">Monto pagado</label>
                        <input
                          type="number"
                          value={paidAmount}
                          onChange={(e) => setPaidAmount(e.target.value)}
                          className={inputClass}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-secondary mb-1">Método de pago</label>
                        <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
                          {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-secondary mb-1">Notas (opcional)</label>
                        <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} placeholder="Observaciones..." />
                      </div>
                      <button
                        onClick={handlePay}
                        disabled={saving || !paidAmount}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-success hover:bg-success/90 text-white text-sm font-semibold rounded-lg transition disabled:opacity-60"
                      >
                        {saving ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
                        Registrar pago
                      </button>
                    </>
                  )}
                </>
              )}

              {/* ── Status tab ── */}
              {tab === 'status' && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Nota (opcional)</label>
                    <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} placeholder="Motivo..." />
                  </div>
                  <div className="grid grid-cols-1 gap-2 pt-1">
                    <button onClick={() => markAs('mark-injured')} disabled={saving}
                      className="flex items-center gap-2 px-4 py-2.5 border border-purple-500/30 bg-purple-500/10 text-purple-500 text-sm font-medium rounded-lg hover:bg-purple-500/20 transition disabled:opacity-60">
                      <Activity size={14} /> Marcar como lesionado
                    </button>
                    <button onClick={() => markAs('mark-not-enrolled')} disabled={saving}
                      className="flex items-center gap-2 px-4 py-2.5 border border-primary/30 bg-primary/10 text-primary text-sm font-medium rounded-lg hover:bg-primary/20 transition disabled:opacity-60">
                      <UserX size={14} /> No inscrito este período
                    </button>
                    <button onClick={() => markAs('mark-exempt')} disabled={saving}
                      className="flex items-center gap-2 px-4 py-2.5 border border-border bg-muted/50 text-secondary text-sm font-medium rounded-lg hover:bg-muted transition disabled:opacity-60">
                      <Gift size={14} /> Marcar como exento (beca)
                    </button>
                  </div>
                </div>
              )}

              {/* ── History tab ── */}
              {tab === 'history' && (
                <div className="space-y-3">
                  <button onClick={sendReminder} disabled={saving || fee.status === 'PAID'}
                    className="w-full flex items-center justify-center gap-2 py-2 border border-border hover:bg-muted text-secondary text-sm font-medium rounded-lg transition disabled:opacity-50">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
                    Enviar recordatorio ahora
                  </button>

                  {fee.reminders && fee.reminders.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recordatorios enviados</p>
                      {fee.reminders.map((r) => (
                        <div key={r.id} className={cn('flex items-center justify-between px-3 py-2 rounded-lg border text-xs',
                          r.success ? 'border-border bg-muted/30' : 'border-danger/20 bg-danger/5')}>
                          <div>
                            <span className="font-medium text-secondary">{r.type.replace(/_/g, ' ')}</span>
                            <span className="text-muted-foreground ml-1">· {r.channel}</span>
                          </div>
                          <span className="text-muted-foreground">
                            {new Date(r.sentAt).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin recordatorios enviados</p>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="px-6 pb-4">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-secondary border border-border rounded-lg hover:bg-muted transition">
                Cerrar
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
