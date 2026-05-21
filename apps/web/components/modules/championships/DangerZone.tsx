'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface Props {
  championshipId: string;
  championshipName: string;
  hasResults: boolean;
  status: string;
}

export function DangerZone({ championshipId, championshipName, hasResults, status }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isNameConfirmed = confirmText.trim() === championshipName.trim();

  function handleDelete() {
    if (!isNameConfirmed) return;
    startTransition(async () => {
      try {
        await api.delete(`/championships/${championshipId}`, {
          data: { confirmName: confirmText, deleteReason: reason || undefined },
        });
        toast.success('Campeonato eliminado');
        router.push('/campeonatos');
      } catch (e: any) {
        const msg = e.response?.data?.error?.message ?? 'Error al eliminar';
        setError(msg);
        toast.error(msg);
      }
    });
  }

  return (
    <section className="mt-8 pt-6 border-t border-border">
      <h3 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
        <AlertTriangle size={15} />
        Zona de peligro
      </h3>

      <div className="border border-red-200 rounded-xl bg-red-50 p-4">
        <p className="text-sm font-medium text-red-700 mb-1">Eliminar campeonato</p>
        <p className="text-xs text-red-600/80 mb-4">
          {hasResults
            ? 'Este campeonato tiene resultados cargados. Eliminarlo marcará el campeonato como cancelado y borrará las estadísticas de jugadores vinculadas. Esta acción no se puede deshacer.'
            : 'El campeonato está en borrador. Se eliminará completamente sin afectar datos de jugadores.'}
        </p>

        {!expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-sm text-red-600 border border-red-300 rounded-lg px-3 py-2 hover:bg-red-100 transition-colors"
          >
            Quiero eliminar este campeonato…
          </button>
        ) : (
          <div className="space-y-3">
            <div className="bg-red-100 rounded-lg p-3 text-xs text-red-700">
              <strong>¿Estás seguro?</strong> Esta acción {hasResults ? 'no se puede deshacer completamente' : 'es irreversible'}.
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                Escribe <strong className="text-neutral-800">"{championshipName}"</strong> para confirmar
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={e => { setConfirmText(e.target.value); setError(''); }}
                placeholder={championshipName}
                className="w-full px-3 py-2 rounded-lg border border-red-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                Motivo de eliminación (opcional)
              </label>
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Ej: Torneo suspendido por falta de equipos"
                className="w-full px-3 py-2 rounded-lg border border-red-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition"
              />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setExpanded(false); setConfirmText(''); setError(''); setReason(''); }}
                className="px-3 py-2 text-sm border border-border rounded-lg text-secondary hover:bg-muted transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!isNameConfirmed || isPending}
                onClick={handleDelete}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition',
                  isNameConfirmed && !isPending
                    ? 'bg-red-500 text-white hover:bg-red-600 cursor-pointer'
                    : 'bg-red-200 text-red-400 cursor-not-allowed'
                )}
              >
                <Trash2 size={13} />
                {isPending ? 'Eliminando…' : 'Eliminar permanentemente'}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
