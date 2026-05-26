'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Users, Pencil, Trash2, Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { TeamModal, type Team } from '@/components/modules/teams/TeamModal';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await api.get('/teams');
      setTeams(res.data.data);
    } catch {
      toast.error('Error al cargar equipos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditingTeam(null);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingTeam(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/teams/${deleteTarget.id}`);
      toast.success(`Equipo "${deleteTarget.name}" eliminado`);
      setDeleteTarget(null);
      fetchTeams();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary">Equipos</h1>
          <p className="text-muted-foreground">Gestión de equipos del club</p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 bg-primary hover:bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
        >
          <Plus size={16} />
          Nuevo equipo
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-xl border border-border p-5 animate-pulse">
              <div className="h-5 bg-muted rounded w-32 mb-2" />
              <div className="h-4 bg-muted rounded w-20 mb-4" />
              <div className="h-4 bg-muted rounded w-24" />
            </div>
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <Trophy className="mx-auto mb-3 text-muted-foreground" size={32} />
          <p className="text-muted-foreground mb-4">No hay equipos registrados</p>
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
          >
            <Plus size={16} />
            Crear primer equipo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <div key={team.id} className="bg-surface rounded-xl border border-border p-5 hover:shadow-sm transition-shadow group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-secondary truncate">{team.name}</h3>
                  <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                    {team.category}
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition ml-2 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(team)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-secondary transition"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(team)}
                    className="p-1.5 rounded-lg hover:bg-danger/10 text-muted-foreground hover:text-danger transition"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users size={14} />
                  <span>{team._count?.players ?? 0} jugadores</span>
                </div>
                <span className="text-xs">{team.season}</span>
              </div>

              {team.coach && (
                <p className="mt-2 text-xs text-muted-foreground border-t border-border pt-2">
                  Coach: {team.coach.firstName} {team.coach.lastName}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <TeamModal
        open={modalOpen}
        onClose={handleModalClose}
        onSuccess={fetchTeams}
        team={editingTeam}
      />

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar equipo</DialogTitle>
            <DialogDescription>
              ¿Confirmas que quieres eliminar el equipo{' '}
              <strong className="text-secondary">"{deleteTarget?.name}"</strong>?
              Esta acción desactivará el equipo y no podrá ser recuperado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 text-sm font-medium text-secondary border border-border rounded-lg hover:bg-muted transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-danger hover:bg-danger/90 text-white rounded-lg transition disabled:opacity-60"
            >
              {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              Eliminar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
