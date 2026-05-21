'use client';

import { useState } from 'react';
import { Pencil, UserX, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Player {
  id: string;
  jerseyNumber?: number;
  position?: string;
  birthDate?: string;
  height?: number;
  weight?: number;
  clothingSize?: string;
  teamId?: string;
  isActive?: boolean;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    rut?: string;
  };
  team?: { id: string; name: string; category: string };
}

interface PlayerTableProps {
  players: Player[];
  loading?: boolean;
  onEdit: (player: Player) => void;
  onDeactivate: (player: Player) => void;
}

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'numeric', year: 'numeric' });
}

export function PlayerTable({ players, loading, onEdit, onDeactivate }: PlayerTableProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b border-border">
            <div className="h-4 bg-muted rounded animate-pulse w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted border-b border-border">
              <th className="text-left px-3 py-2.5 font-semibold text-secondary text-xs whitespace-nowrap">Apellidos</th>
              <th className="text-left px-3 py-2.5 font-semibold text-secondary text-xs whitespace-nowrap">Nombre</th>
              <th className="text-left px-3 py-2.5 font-semibold text-secondary text-xs whitespace-nowrap">RUT</th>
              <th className="text-left px-3 py-2.5 font-semibold text-secondary text-xs whitespace-nowrap">Fecha Nacimiento</th>
              <th className="text-left px-3 py-2.5 font-semibold text-secondary text-xs whitespace-nowrap">Talla</th>
              <th className="text-left px-3 py-2.5 font-semibold text-secondary text-xs whitespace-nowrap">N° Camiseta</th>
              <th className="text-left px-3 py-2.5 font-semibold text-secondary text-xs whitespace-nowrap">Correo Electrónico</th>
              <th className="px-3 py-2.5 w-10" />
            </tr>
          </thead>
          <tbody>
            {players.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">
                  No hay jugadores registrados
                </td>
              </tr>
            ) : (
              players.map((player, idx) => {
                const isOpen = openMenuId === player.id;
                return (
                  <tr
                    key={player.id}
                    className={cn(
                      'border-b border-border hover:bg-primary/5 transition',
                      idx % 2 === 0 ? 'bg-white' : 'bg-muted/30',
                    )}
                  >
                    <td className="px-3 py-2 font-medium text-secondary text-xs whitespace-nowrap">
                      {player.user.lastName}
                    </td>
                    <td className="px-3 py-2 text-secondary text-xs whitespace-nowrap">
                      {player.user.firstName}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground text-xs whitespace-nowrap font-mono">
                      {player.user.rut ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground text-xs whitespace-nowrap">
                      {fmtDate(player.birthDate)}
                    </td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">
                      {player.clothingSize ? (
                        <span className="px-2 py-0.5 rounded bg-muted text-secondary font-medium">
                          {player.clothingSize}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">
                      {player.jerseyNumber != null ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs">
                          {player.jerseyNumber}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">
                      {player.user.email}
                    </td>
                    <td className="px-3 py-2 relative">
                      <div className="flex justify-end">
                        <button
                          onClick={() => setOpenMenuId(isOpen ? null : player.id)}
                          className="p-1 rounded hover:bg-muted transition text-muted-foreground hover:text-secondary"
                        >
                          <MoreHorizontal size={14} />
                        </button>
                        {isOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                            <div className="absolute right-0 top-7 z-20 bg-white border border-border rounded-xl shadow-lg py-1 min-w-[140px]">
                              <button
                                onClick={() => { onEdit(player); setOpenMenuId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-muted transition"
                              >
                                <Pencil size={13} /> Editar
                              </button>
                              <button
                                onClick={() => { onDeactivate(player); setOpenMenuId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition"
                              >
                                <UserX size={13} /> Desactivar
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
