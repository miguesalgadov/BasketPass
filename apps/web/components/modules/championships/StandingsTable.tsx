'use client';

import { cn } from '@/lib/utils';

export interface StandingRow {
  position: number;
  teamId: string;
  teamName: string;
  groupNumber?: number | null;
  played: number;
  wins: number;
  losses: number;
  walkoverWins: number;
  walkoverLosses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsDiff: number;
  points: number;
}

interface StandingsTableProps {
  rows: StandingRow[];
  playoffTeams?: number;
  groupLabel?: string;
  teamsQualifyPerGroup?: number;
}

export function StandingsTable({ rows, playoffTeams = 0, groupLabel, teamsQualifyPerGroup }: StandingsTableProps) {
  // When rendering inside a group context, qualifying is based on position within the group
  const effectiveQualifyCount = teamsQualifyPerGroup ?? playoffTeams;
  if (rows.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8 text-sm">
        No hay equipos en la tabla aún.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {groupLabel && (
        <h3 className="font-semibold text-secondary text-base">{groupLabel}</h3>
      )}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wide">
              <th className="px-3 py-3 text-center w-8">#</th>
              <th className="px-3 py-3 text-left">Equipo</th>
              <th className="px-3 py-3 text-center">PJ</th>
              <th className="px-3 py-3 text-center">PG</th>
              <th className="px-3 py-3 text-center">PP</th>
              <th className="px-3 py-3 text-center" title="Walkovers ganados">WO+</th>
              <th className="px-3 py-3 text-center" title="Walkovers perdidos">WO-</th>
              <th className="px-3 py-3 text-center">PF</th>
              <th className="px-3 py-3 text-center">PC</th>
              <th className="px-3 py-3 text-center">DIF</th>
              <th className="px-3 py-3 text-center font-bold">PTS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {rows.map((row) => {
              const qualifies = effectiveQualifyCount > 0 && row.position <= effectiveQualifyCount;
              const isLast = row.position === rows.length;

              return (
                <tr
                  key={row.teamId}
                  className={cn(
                    'hover:bg-muted/40 transition-colors',
                    qualifies && 'bg-success/5'
                  )}
                >
                  {/* Position */}
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {qualifies && (
                        <div className="w-1 h-5 rounded-full bg-success flex-shrink-0" />
                      )}
                      <span
                        className={cn(
                          'font-medium',
                          qualifies ? 'text-success' : 'text-muted-foreground'
                        )}
                      >
                        {row.position}
                      </span>
                    </div>
                  </td>

                  {/* Team name */}
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        'font-medium',
                        qualifies ? 'text-secondary' : 'text-secondary'
                      )}
                    >
                      {row.teamName}
                    </span>
                  </td>

                  <td className="px-3 py-3 text-center text-muted-foreground">{row.played}</td>
                  <td className="px-3 py-3 text-center text-muted-foreground">{row.wins}</td>
                  <td className="px-3 py-3 text-center text-muted-foreground">{row.losses}</td>
                  <td className="px-3 py-3 text-center text-muted-foreground">{row.walkoverWins}</td>
                  <td className="px-3 py-3 text-center text-muted-foreground">{row.walkoverLosses}</td>
                  <td className="px-3 py-3 text-center text-muted-foreground">{row.pointsFor}</td>
                  <td className="px-3 py-3 text-center text-muted-foreground">{row.pointsAgainst}</td>
                  <td
                    className={cn(
                      'px-3 py-3 text-center font-medium',
                      row.pointsDiff > 0
                        ? 'text-success'
                        : row.pointsDiff < 0
                        ? 'text-danger'
                        : 'text-muted-foreground'
                    )}
                  >
                    {row.pointsDiff > 0 ? `+${row.pointsDiff}` : row.pointsDiff}
                  </td>

                  {/* Points — bold, green for qualifying */}
                  <td
                    className={cn(
                      'px-3 py-3 text-center font-bold text-base',
                      qualifies ? 'text-success' : 'text-secondary'
                    )}
                  >
                    {row.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* FIBA legend */}
      <div className="bg-muted/50 rounded-lg px-4 py-3 text-xs text-muted-foreground border border-border">
        <span className="font-medium text-secondary">Reglamento FIBA: </span>
        Victoria → 2pts · Derrota → 1pt · WO perdido → 0pts · Desempate: H2H →
        Dif.H2H → PF.H2H → Dif.global (cap ±150)
      </div>

      {/* Playoff zone legend */}
      {effectiveQualifyCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-3 h-3 rounded-sm bg-success/20 border border-success/40" />
          <span>{teamsQualifyPerGroup ? `Clasifican a playoffs (top ${teamsQualifyPerGroup} por grupo)` : `Zona playoffs (top ${playoffTeams})`}</span>
        </div>
      )}
    </div>
  );
}
