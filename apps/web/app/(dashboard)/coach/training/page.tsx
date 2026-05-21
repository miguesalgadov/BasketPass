'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Clock, MapPin, FileText, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { TrainingModal, type Training } from '@/components/modules/calendar/TrainingModal';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

export default function CoachTrainingPage() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen]           = useState(false);
  const [editingTraining, setEditingTraining] = useState<Training | null>(null);
  const [deleteTarget, setDeleteTarget]       = useState<Training | null>(null);
  const [deleting, setDeleting]               = useState(false);

  const fetchTrainings = useCallback(async () => {
    try {
      const res = await api.get('/trainings');
      setTrainings(res.data.data ?? []);
    } catch {
      toast.error('Error al cargar entrenamientos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTrainings(); }, [fetchTrainings]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/trainings/${deleteTarget.id}`);
      toast.success('Entrenamiento eliminado');
      setDeleteTarget(null);
      fetchTrainings();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  // Group by upcoming / past
  const now = new Date();
  const upcoming = trainings.filter((t) => new Date(t.date) >= now).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const past     = trainings.filter((t) => new Date(t.date) < now).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary">Entrenamientos</h1>
          <p className="text-muted-foreground">Planificación y registro de sesiones</p>
        </div>
        <button
          onClick={() => { setEditingTraining(null); setModalOpen(true); }}
          className="flex items-center gap-2 bg-primary hover:bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
        >
          <Plus size={16} /> Nuevo entrenamiento
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-xl border border-border p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : trainings.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground mb-4">No hay entrenamientos programados.</p>
          <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 bg-primary hover:bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg transition text-sm">
            <Plus size={15} /> Crear primero
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <Section title="Próximos" trainings={upcoming}
              onEdit={(t) => { setEditingTraining(t); setModalOpen(true); }}
              onDelete={setDeleteTarget} />
          )}
          {past.length > 0 && (
            <Section title="Pasados" trainings={past}
              onEdit={(t) => { setEditingTraining(t); setModalOpen(true); }}
              onDelete={setDeleteTarget} />
          )}
        </div>
      )}

      <TrainingModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingTraining(null); }}
        onSuccess={fetchTrainings}
        training={editingTraining}
      />

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar entrenamiento</DialogTitle>
            <DialogDescription>Esta acción no se puede deshacer. ¿Confirmás?</DialogDescription>
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

function Section({ title, trainings, onEdit, onDelete }: {
  title: string;
  trainings: Training[];
  onEdit: (t: Training) => void;
  onDelete: (t: Training) => void;
}) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{title}</h2>
      <div className="space-y-3">
        {trainings.map((t) => (
          <div key={t.id} className="bg-surface rounded-xl border border-border p-5 hover:shadow-sm transition group">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-secondary">{t.team?.name ?? '—'}</span>
                  {t.team?.category && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">{t.team.category}</span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><Clock size={10} /> {formatDateTime(t.date)}</span>
                  <span className="flex items-center gap-1">⏱ {t.duration} min</span>
                  {t.location && <span className="flex items-center gap-1"><MapPin size={10} /> {t.location}</span>}
                </div>
                {t.plan && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs font-medium text-secondary flex items-center gap-1 mb-1"><FileText size={11} /> Plan</p>
                    <p className="text-xs text-muted-foreground whitespace-pre-line">{t.plan}</p>
                  </div>
                )}
                {t.coachNotes && (
                  <p className="mt-2 text-xs text-muted-foreground italic">{t.coachNotes}</p>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                <button onClick={() => onEdit(t)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-secondary transition"><Pencil size={14} /></button>
                <button onClick={() => onDelete(t)} className="p-1.5 rounded-lg hover:bg-danger/10 text-muted-foreground hover:text-danger transition"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
