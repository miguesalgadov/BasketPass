'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface Player {
  id: string;
  jerseyNumber?: number;
  position?: string;
  height?: number;
  weight?: number;
  user: { firstName: string; lastName: string; email: string; phone?: string };
  team?: { name: string; category: string };
}

const POSITION_COLOR: Record<string, string> = {
  PG: 'bg-primary/10 text-primary',
  SG: 'bg-accent/10 text-accent',
  SF: 'bg-success/10 text-success',
  PF: 'bg-warning/10 text-warning',
  C:  'bg-danger/10 text-danger',
};

export default function CoachPlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    const timeout = setTimeout(async () => {
      try {
        const res = await api.get('/players', { params: { search: search || undefined, limit: 100 } });
        setPlayers(res.data.data ?? []);
      } catch {
        toast.error('Error al cargar jugadores');
      } finally {
        setLoading(false);
      }
    }, search ? 300 : 0);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary">Jugadores</h1>
        <p className="text-muted-foreground">Plantel completo del club</p>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar jugador..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 border border-border rounded-lg bg-surface text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted border-b border-border">
              <tr>
                {['Jugador', '#', 'Posición', 'Equipo', 'Contacto'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : players.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    {search ? 'Sin resultados para la búsqueda' : 'No hay jugadores registrados'}
                  </td>
                </tr>
              ) : (
                players.map((p) => (
                  <tr key={p.id} className="border-b border-border hover:bg-muted/40 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {p.user.firstName[0]}{p.user.lastName[0]}
                        </div>
                        <p className="font-medium text-secondary">{p.user.firstName} {p.user.lastName}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.jerseyNumber ?? '—'}</td>
                    <td className="px-4 py-3">
                      {p.position
                        ? <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', POSITION_COLOR[p.position] ?? 'bg-muted text-muted-foreground')}>{p.position}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {p.team
                        ? <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs font-medium">{p.team.name} · {p.team.category}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      <p>{p.user.email}</p>
                      {p.user.phone && <p>{p.user.phone}</p>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
