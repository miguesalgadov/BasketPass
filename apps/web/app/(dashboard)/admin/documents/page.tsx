'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, ExternalLink, Trash2, FileText, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

interface Doc {
  id: string; title: string; fileUrl: string; type: string;
  uploadedAt: string; expiresAt?: string;
  player?: { user: { firstName: string; lastName: string } };
}

interface Player { id: string; user: { firstName: string; lastName: string }; }

const DOC_TYPES = [
  { value: 'DNI',          label: 'DNI / Identificación' },
  { value: 'FICHA_MEDICA', label: 'Ficha médica' },
  { value: 'CONTRATO',     label: 'Contrato' },
  { value: 'SEGURO',       label: 'Seguro' },
  { value: 'AUTORIZACION', label: 'Autorización' },
  { value: 'OTRO',         label: 'Otro' },
];

const TYPE_COLOR: Record<string, string> = {
  DNI:          'bg-primary/10 text-primary',
  FICHA_MEDICA: 'bg-danger/10 text-danger',
  CONTRATO:     'bg-success/10 text-success',
  SEGURO:       'bg-accent/10 text-accent',
  AUTORIZACION: 'bg-warning/10 text-warning',
  OTRO:         'bg-muted text-muted-foreground',
};

const schema = z.object({
  title:    z.string().min(1, 'Requerido').max(200),
  fileUrl:  z.string().url('URL inválida'),
  type:     z.enum(['DNI', 'FICHA_MEDICA', 'CONTRATO', 'SEGURO', 'AUTORIZACION', 'OTRO']),
  playerId: z.string().optional(),
  expiresAt: z.string().optional(),
});
type DocForm = z.infer<typeof schema>;

const inputClass = 'w-full px-3 py-2 border border-border rounded-lg bg-surface text-secondary text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition';

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-secondary mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}

export default function DocumentsPage() {
  const [docs, setDocs]           = useState<Doc[]>([]);
  const [players, setPlayers]     = useState<Player[]>([]);
  const [loading, setLoading]     = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch]       = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Doc | null>(null);
  const [deleting, setDeleting]   = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<DocForm>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'OTRO' },
  });

  const fetchDocs = useCallback(async () => {
    try {
      const res = await api.get('/documents', { params: { type: typeFilter || undefined } });
      setDocs(res.data.data ?? []);
    } catch { toast.error('Error al cargar documentos'); }
    finally { setLoading(false); }
  }, [typeFilter]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  useEffect(() => {
    api.get('/players', { params: { limit: 100 } }).then((r) => setPlayers(r.data.data ?? [])).catch(() => {});
  }, []);

  const onSubmit = async (data: DocForm) => {
    try {
      await api.post('/documents', {
        ...data,
        playerId: data.playerId || undefined,
        expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : undefined,
      });
      toast.success('Documento registrado');
      reset();
      setModalOpen(false);
      fetchDocs();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Error al guardar');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/documents/${deleteTarget.id}`);
      toast.success('Documento eliminado');
      setDeleteTarget(null);
      fetchDocs();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Error al eliminar');
    } finally { setDeleting(false); }
  };

  const filtered = docs.filter((d) =>
    !search || d.title.toLowerCase().includes(search.toLowerCase()) ||
    (d.player && `${d.player.user.firstName} ${d.player.user.lastName}`.toLowerCase().includes(search.toLowerCase()))
  );

  const isExpiringSoon = (expiresAt?: string) => {
    if (!expiresAt) return false;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
  };
  const isExpired = (expiresAt?: string) => expiresAt ? new Date(expiresAt) < new Date() : false;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary">Documentos</h1>
          <p className="text-muted-foreground">Gestión de documentos del club y jugadores</p>
        </div>
        <button onClick={() => { reset({ type: 'OTRO' }); setModalOpen(true); }}
          className="flex items-center gap-2 bg-primary hover:bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg transition text-sm">
          <Plus size={16} /> Agregar documento
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-2 border border-border rounded-lg bg-surface text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary w-48" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setTypeFilter('')}
            className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition', !typeFilter ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
            Todos
          </button>
          {DOC_TYPES.map((t) => (
            <button key={t.value} onClick={() => setTypeFilter(typeFilter === t.value ? '' : t.value)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition', typeFilter === t.value ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Document list */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted border-b border-border">
            <tr>
              {['Documento', 'Tipo', 'Jugador', 'Vencimiento', ''].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>)}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center">
                <FileText size={32} className="mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">No hay documentos registrados</p>
              </td></tr>
            ) : (
              filtered.map((doc) => (
                <tr key={doc.id} className="border-b border-border hover:bg-muted/40 transition">
                  <td className="px-4 py-3">
                    <p className="font-medium text-secondary">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(doc.uploadedAt).toLocaleDateString('es-AR')}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', TYPE_COLOR[doc.type] ?? TYPE_COLOR.OTRO)}>
                      {DOC_TYPES.find((t) => t.value === doc.type)?.label ?? doc.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-sm">
                    {doc.player ? `${doc.player.user.firstName} ${doc.player.user.lastName}` : <span className="italic">Club general</span>}
                  </td>
                  <td className="px-4 py-3">
                    {doc.expiresAt ? (
                      <span className={cn('text-xs font-medium',
                        isExpired(doc.expiresAt) ? 'text-danger' : isExpiringSoon(doc.expiresAt) ? 'text-warning' : 'text-muted-foreground'
                      )}>
                        {isExpired(doc.expiresAt) ? '⚠ Vencido · ' : isExpiringSoon(doc.expiresAt) ? '⏰ Vence · ' : ''}
                        {new Date(doc.expiresAt).toLocaleDateString('es-AR')}
                      </span>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-secondary transition" title="Abrir">
                        <ExternalLink size={14} />
                      </a>
                      <button onClick={() => setDeleteTarget(doc)}
                        className="p-1.5 rounded-lg hover:bg-danger/10 text-muted-foreground hover:text-danger transition" title="Eliminar">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add document modal */}
      <Dialog open={modalOpen} onOpenChange={(v) => !v && setModalOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar documento</DialogTitle>
            <DialogDescription>Registrá un documento con su enlace de acceso.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
            <Field label="Título" error={errors.title?.message}>
              <input {...register('title')} className={inputClass} placeholder="Ej: DNI Juan García" />
            </Field>
            <Field label="Tipo">
              <select {...register('type')} className={inputClass}>
                {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="URL del documento" error={errors.fileUrl?.message}>
              <input {...register('fileUrl')} className={inputClass} placeholder="https://drive.google.com/..." />
              <p className="text-xs text-muted-foreground mt-1">Google Drive, Dropbox, OneDrive, o cualquier URL pública</p>
            </Field>
            <Field label="Jugador (opcional)">
              <select {...register('playerId')} className={inputClass}>
                <option value="">— Club general —</option>
                {players.map((p) => <option key={p.id} value={p.id}>{p.user.firstName} {p.user.lastName}</option>)}
              </select>
            </Field>
            <Field label="Fecha de vencimiento (opcional)">
              <input {...register('expiresAt')} type="date" className={inputClass} />
            </Field>
            <DialogFooter>
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-secondary border border-border rounded-lg hover:bg-muted transition">Cancelar</button>
              <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary hover:bg-primary-600 text-white rounded-lg transition disabled:opacity-60">
                {isSubmitting && <Loader2 size={15} className="animate-spin" />} Guardar
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar documento</DialogTitle>
            <DialogDescription>¿Eliminás "<strong className="text-secondary">{deleteTarget?.title}</strong>"? Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm font-medium text-secondary border border-border rounded-lg hover:bg-muted transition">Cancelar</button>
            <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-danger hover:bg-danger/90 text-white rounded-lg transition disabled:opacity-60">
              {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Eliminar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
