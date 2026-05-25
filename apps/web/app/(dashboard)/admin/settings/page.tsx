'use client';

import { useEffect, useState } from 'react';
import { Settings, Building2, Lock, Tag, Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface Club { id: string; name: string; slug: string; primaryColor: string | null; plan: string }
interface FeeType { id: string; name: string; amount: number; currency: string; isRecurring: boolean; dueDayOfMonth: number | null }

const CURRENCIES = ['CLP', 'ARS', 'PEN', 'COP', 'MXN', 'USD'];

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
        <span className="text-primary">{icon}</span>
        <h2 className="text-sm font-semibold text-secondary">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const [club, setClub] = useState<Club | null>(null);
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [loadingClub, setLoadingClub] = useState(true);

  // Club form
  const [clubName, setClubName]   = useState('');
  const [clubColor, setClubColor] = useState('#F97316');
  const [savingClub, setSavingClub] = useState(false);

  // Password form
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd,     setNewPwd]     = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingPwd,  setSavingPwd]  = useState(false);

  // FeeType form
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [editingFee,  setEditingFee]  = useState<FeeType | null>(null);
  const [feeName,     setFeeName]     = useState('');
  const [feeAmount,   setFeeAmount]   = useState('');
  const [feeCurrency, setFeeCurrency] = useState('CLP');
  const [feeDay,      setFeeDay]      = useState('5');
  const [savingFee,   setSavingFee]   = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/club'),
      api.get('/fee-types'),
    ]).then(([clubRes, feeRes]) => {
      const c = clubRes.data.data;
      setClub(c);
      setClubName(c.name);
      setClubColor(c.primaryColor || '#F97316');
      setFeeTypes(feeRes.data.data ?? []);
    }).catch(() => toast.error('Error al cargar configuración'))
      .finally(() => setLoadingClub(false));
  }, []);

  async function saveClub() {
    if (!clubName.trim()) return;
    setSavingClub(true);
    try {
      const res = await api.patch('/club', { name: clubName, primaryColor: clubColor });
      setClub(res.data.data);
      toast.success('Club actualizado');
    } catch { toast.error('Error al guardar'); }
    finally { setSavingClub(false); }
  }

  async function changePassword() {
    if (!currentPwd || !newPwd || !confirmPwd) { toast.error('Completá todos los campos'); return; }
    if (newPwd !== confirmPwd) { toast.error('Las contraseñas no coinciden'); return; }
    if (newPwd.length < 8) { toast.error('Mínimo 8 caracteres'); return; }
    setSavingPwd(true);
    try {
      await api.post('/auth/change-password', { currentPassword: currentPwd, newPassword: newPwd });
      toast.success('Contraseña actualizada');
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message ?? 'Error al cambiar contraseña');
    } finally { setSavingPwd(false); }
  }

  function openNewFee() {
    setEditingFee(null);
    setFeeName(''); setFeeAmount(''); setFeeCurrency('CLP'); setFeeDay('5');
    setShowFeeForm(true);
  }

  function openEditFee(ft: FeeType) {
    setEditingFee(ft);
    setFeeName(ft.name); setFeeAmount(String(ft.amount));
    setFeeCurrency(ft.currency); setFeeDay(String(ft.dueDayOfMonth ?? 5));
    setShowFeeForm(true);
  }

  async function saveFeeType() {
    if (!feeName.trim() || !feeAmount) { toast.error('Completá nombre y monto'); return; }
    setSavingFee(true);
    try {
      const body = { name: feeName, amount: parseFloat(feeAmount), currency: feeCurrency, isRecurring: true, dueDayOfMonth: parseInt(feeDay) };
      if (editingFee) {
        const res = await api.patch(`/fee-types/${editingFee.id}`, body);
        setFeeTypes(prev => prev.map(f => f.id === editingFee.id ? res.data.data : f));
        toast.success('Tipo de cuota actualizado');
      } else {
        const res = await api.post('/fee-types', body);
        setFeeTypes(prev => [...prev, res.data.data]);
        toast.success('Tipo de cuota creado');
      }
      setShowFeeForm(false);
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message ?? 'Error al guardar');
    } finally { setSavingFee(false); }
  }

  async function deleteFeeType(id: string) {
    if (!confirm('¿Eliminar este tipo de cuota?')) return;
    try {
      await api.delete(`/fee-types/${id}`);
      setFeeTypes(prev => prev.filter(f => f.id !== id));
      toast.success('Tipo de cuota eliminado');
    } catch { toast.error('Error al eliminar'); }
  }

  if (loadingClub) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <Settings size={20} className="text-primary" />
        <h1 className="text-lg font-bold text-secondary">Configuración</h1>
      </div>

      {/* Club profile */}
      <SectionCard title="Perfil del club" icon={<Building2 size={15} />}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nombre del club</label>
            <input
              value={clubName}
              onChange={e => setClubName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Color principal</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={clubColor}
                onChange={e => setClubColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0.5"
              />
              <span className="text-sm text-muted-foreground font-mono">{clubColor}</span>
              <div className="w-8 h-8 rounded-full border border-border" style={{ background: clubColor }} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Plan</label>
            <span className={cn(
              'inline-block px-2.5 py-1 rounded-full text-xs font-semibold',
              club?.plan === 'PRO' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            )}>
              {club?.plan ?? 'FREE'}
            </span>
          </div>
          <button
            onClick={saveClub}
            disabled={savingClub || !clubName.trim()}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
          >
            {savingClub ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </SectionCard>

      {/* Fee types */}
      <SectionCard title="Tipos de cuota" icon={<Tag size={15} />}>
        <div className="space-y-3">
          {feeTypes.length === 0 && !showFeeForm && (
            <p className="text-sm text-muted-foreground py-2">No hay tipos de cuota configurados.</p>
          )}

          {feeTypes.map(ft => (
            <div key={ft.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
              <div>
                <p className="text-sm font-medium text-secondary">{ft.name}</p>
                <p className="text-xs text-muted-foreground">
                  {ft.currency} {ft.amount.toLocaleString()} · Vence día {ft.dueDayOfMonth ?? '—'}
                </p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEditFee(ft)}
                  className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition">
                  <Pencil size={13} />
                </button>
                <button onClick={() => deleteFeeType(ft.id)}
                  className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-500 transition">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}

          {showFeeForm && (
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
              <p className="text-xs font-semibold text-secondary">{editingFee ? 'Editar tipo de cuota' : 'Nuevo tipo de cuota'}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Nombre</label>
                  <input value={feeName} onChange={e => setFeeName(e.target.value)} placeholder="Ej: Cuota mensual"
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Monto</label>
                  <input type="number" value={feeAmount} onChange={e => setFeeAmount(e.target.value)} placeholder="15000"
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Moneda</label>
                  <select value={feeCurrency} onChange={e => setFeeCurrency(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-primary">
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Día de vencimiento</label>
                  <input type="number" min="1" max="28" value={feeDay} onChange={e => setFeeDay(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveFeeType} disabled={savingFee}
                  className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-xs font-semibold rounded-lg transition disabled:opacity-50">
                  <Check size={13} /> {savingFee ? 'Guardando...' : 'Guardar'}
                </button>
                <button onClick={() => setShowFeeForm(false)}
                  className="flex items-center gap-1.5 px-3 py-2 border border-border text-secondary text-xs font-medium rounded-lg hover:bg-muted/50 transition">
                  <X size={13} /> Cancelar
                </button>
              </div>
            </div>
          )}

          {!showFeeForm && (
            <button onClick={openNewFee}
              className="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-primary hover:border-primary transition w-full">
              <Plus size={14} /> Agregar tipo de cuota
            </button>
          )}
        </div>
      </SectionCard>

      {/* Change password */}
      <SectionCard title="Cambiar contraseña" icon={<Lock size={15} />}>
        <div className="space-y-3">
          {[
            { label: 'Contraseña actual', value: currentPwd, setter: setCurrentPwd },
            { label: 'Nueva contraseña',  value: newPwd,     setter: setNewPwd     },
            { label: 'Confirmar nueva',   value: confirmPwd, setter: setConfirmPwd },
          ].map(({ label, value, setter }) => (
            <div key={label}>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
              <input
                type="password"
                value={value}
                onChange={e => setter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          ))}
          <button
            onClick={changePassword}
            disabled={savingPwd}
            className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
          >
            {savingPwd ? 'Actualizando...' : 'Actualizar contraseña'}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
