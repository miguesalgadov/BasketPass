'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Upload } from 'lucide-react';
import { PlayerTable, type Player } from '@/components/modules/players/PlayerTable';
import { PlayerModal } from '@/components/modules/players/PlayerModal';
import { ImportPlayersModal } from '@/components/modules/players/ImportPlayersModal';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, UserX } from 'lucide-react';

interface Team { id: string; name: string; category: string; }

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams]     = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  const [modalOpen, setModalOpen]     = useState(false);
  const [importOpen, setImportOpen]   = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  const [deactivateTarget, setDeactivateTarget] = useState<Player | null>(null);
  const [deactivating, setDeactivating]         = useState(false);

  useEffect(() => {
    api.get('/teams', { params: { limit: 100 } })
      .then((r) => setTeams(r.data.data ?? []))
      .catch(() => {});
  }, []);

  const fetchPlayers = useCallback(async () => {
    try {
      const res = await api.get('/players', { params: { search: search || undefined } });
      setPlayers(res.data.data);
    } catch {
      toast.error('Error al cargar jugadores');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(fetchPlayers, search ? 300 : 0);
    return () => clearTimeout(timeout);
  }, [fetchPlayers, search]);

  const handleEdit = (player: Player) => {
    setEditingPlayer(player);
    setModalOpen(true);
  };

  const handleNewPlayer = () => {
    setEditingPlayer(null);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingPlayer(null);
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      await api.delete(`/players/${deactivateTarget.id}`);
      toast.success(`${deactivateTarget.user.firstName} ${deactivateTarget.user.lastName} desactivado`);
      setDeactivateTarget(null);
      fetchPlayers();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Error al desactivar');
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary">Jugadores</h1>
          <p className="text-muted-foreground">Gestión del plantel del club</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 border border-border hover:bg-muted text-secondary font-semibold py-2 px-4 rounded-lg transition text-sm"
          >
            <Upload size={16} />
            Importar
          </button>
          <button
            onClick={handleNewPlayer}
            className="flex items-center gap-2 bg-primary hover:bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
          >
            <Plus size={16} />
            Nuevo jugador
          </button>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar jugador..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm pl-9 pr-3 py-2.5 border border-border rounded-lg bg-surface text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <PlayerTable
        players={players}
        loading={loading}
        onEdit={handleEdit}
        onDeactivate={setDeactivateTarget}
      />

      <PlayerModal
        open={modalOpen}
        onClose={handleModalClose}
        onSuccess={fetchPlayers}
        player={editingPlayer}
      />

      <ImportPlayersModal
        open={importOpen}
        teams={teams}
        onClose={() => setImportOpen(false)}
        onDone={() => { setImportOpen(false); fetchPlayers(); }}
      />

      <Dialog open={Boolean(deactivateTarget)} onOpenChange={(v) => !v && setDeactivateTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desactivar jugador</DialogTitle>
            <DialogDescription>
              ¿Confirmás que querés desactivar a{' '}
              <strong className="text-secondary">
                {deactivateTarget?.user.firstName} {deactivateTarget?.user.lastName}
              </strong>
              ? El jugador no podrá acceder al sistema mientras esté inactivo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setDeactivateTarget(null)}
              className="px-4 py-2 text-sm font-medium text-secondary border border-border rounded-lg hover:bg-muted transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleDeactivate}
              disabled={deactivating}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-danger hover:bg-danger/90 text-white rounded-lg transition disabled:opacity-60"
            >
              {deactivating ? <Loader2 size={15} className="animate-spin" /> : <UserX size={15} />}
              Desactivar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
