'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import { useChampionship } from '../championship-context';
import {
  StandingsTable,
  type StandingRow,
} from '@/components/modules/championships/StandingsTable';
import toast from 'react-hot-toast';

const GROUP_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export default function TablaPage() {
  const params = useParams<{ id: string }>();
  const { championship, loading: championshipLoading } = useChampionship();

  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;

    async function fetchStandings() {
      try {
        const res = await api.get(`/championships/${params.id}/standings`);
        setStandings(res.data.data ?? res.data);
      } catch {
        toast.error('Error al cargar la tabla');
      } finally {
        setLoading(false);
      }
    }

    fetchStandings();
  }, [params.id]);

  // Show empty state if not started yet
  if (
    !championshipLoading &&
    championship &&
    (championship.status === 'DRAFT' || championship.status === 'REGISTRATION')
  ) {
    return (
      <div className="bg-surface rounded-xl border border-border p-12 text-center">
        <Trophy className="mx-auto mb-3 text-muted-foreground" size={36} />
        <p className="font-medium text-secondary mb-1">
          El campeonato aún no ha comenzado
        </p>
        <p className="text-sm text-muted-foreground">
          {championship.status === 'DRAFT'
            ? 'El campeonato está en borrador. Abrí las inscripciones para agregar equipos.'
            : 'El campeonato está en inscripciones. Iniciá la temporada regular para ver la tabla.'}
        </p>
      </div>
    );
  }

  if (loading || championshipLoading) {
    return (
      <div className="space-y-3">
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="bg-muted h-10 animate-pulse" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-3 px-4 py-3 border-t border-border animate-pulse"
            >
              <div className="h-4 w-6 bg-muted rounded" />
              <div className="h-4 flex-1 bg-muted rounded" />
              {Array.from({ length: 9 }).map((_, j) => (
                <div key={j} className="h-4 w-8 bg-muted rounded" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const isGroups = championship?.format === 'GROUPS_THEN_PLAYOFFS';

  if (isGroups) {
    // Group standings rows by groupNumber
    const groupMap = new Map<number, StandingRow[]>();
    for (const row of standings) {
      const g = row.groupNumber ?? 1;
      if (!groupMap.has(g)) groupMap.set(g, []);
      groupMap.get(g)!.push(row);
    }
    const sortedGroups = [...groupMap.entries()].sort((a, b) => a[0] - b[0]);

    return (
      <div className="space-y-8">
        {sortedGroups.map(([groupNum, groupRows]) => {
          const letter = GROUP_LETTERS[(groupNum - 1) % 26] ?? String(groupNum);
          return (
            <StandingsTable
              key={groupNum}
              rows={groupRows}
              groupLabel={`Grupo ${letter}`}
              teamsQualifyPerGroup={championship?.teamsQualifyPerGroup ?? 2}
              playoffTeams={0}
            />
          );
        })}
      </div>
    );
  }

  return (
    <StandingsTable
      rows={standings}
      playoffTeams={championship?.playoffTeams ?? 0}
    />
  );
}
