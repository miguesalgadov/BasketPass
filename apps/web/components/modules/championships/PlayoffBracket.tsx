'use client';

import { cn } from '@/lib/utils';

export interface BracketParticipant {
  teamId?: string;
  teamName?: string;
  seed?: number;
  score?: number;
  isWinner?: boolean;
}

export interface BracketMatch {
  id: string;
  home: BracketParticipant;
  away: BracketParticipant;
  isThirdPlace?: boolean;
}

export interface BracketRound {
  name: string;
  matches: BracketMatch[];
}

interface PlayoffBracketProps {
  rounds: BracketRound[];
}

function ParticipantRow({
  participant,
  isWinner,
}: {
  participant: BracketParticipant;
  isWinner: boolean;
}) {
  const isEmpty = !participant.teamId && !participant.teamName;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition',
        isEmpty
          ? 'bg-muted/50 text-muted-foreground italic'
          : isWinner
          ? 'bg-success/10 border border-success/30'
          : 'bg-surface border border-border'
      )}
    >
      {participant.seed !== undefined && !isEmpty && (
        <span className="w-5 h-5 rounded-full bg-muted text-xs font-bold text-muted-foreground flex items-center justify-center flex-shrink-0">
          {participant.seed}
        </span>
      )}
      <span
        className={cn(
          'flex-1 font-medium truncate',
          isEmpty ? '' : isWinner ? 'text-success' : 'text-secondary'
        )}
      >
        {isEmpty ? 'TBD' : participant.teamName ?? 'TBD'}
      </span>
      {participant.score !== undefined && !isEmpty && (
        <span
          className={cn(
            'font-bold text-base ml-auto flex-shrink-0',
            isWinner ? 'text-success' : 'text-secondary'
          )}
        >
          {participant.score}
        </span>
      )}
    </div>
  );
}

function MatchCard({ match }: { match: BracketMatch }) {
  return (
    <div
      className={cn(
        'bg-surface rounded-xl border border-border overflow-hidden w-52',
        match.isThirdPlace && 'border-dashed opacity-80'
      )}
    >
      {match.isThirdPlace && (
        <div className="bg-muted px-3 py-1 text-xs text-muted-foreground font-medium border-b border-border">
          3er puesto
        </div>
      )}
      <div className="p-2 space-y-1.5">
        <ParticipantRow
          participant={match.home}
          isWinner={!!match.home.isWinner}
        />
        <ParticipantRow
          participant={match.away}
          isWinner={!!match.away.isWinner}
        />
      </div>
    </div>
  );
}

export function PlayoffBracket({ rounds }: PlayoffBracketProps) {
  if (rounds.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8 text-sm">
        No hay bracket disponible.
      </p>
    );
  }

  // Separate main bracket rounds from 3rd place match
  const mainRounds = rounds.filter((r) =>
    r.matches.some((m) => !m.isThirdPlace)
  );
  const thirdPlaceMatch = rounds
    .flatMap((r) => r.matches)
    .find((m) => m.isThirdPlace);

  return (
    <div className="space-y-6">
      {/* Main bracket — horizontal scroll */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-8 min-w-max items-start pt-4">
          {mainRounds.map((round, ri) => {
            const regularMatches = round.matches.filter(
              (m) => !m.isThirdPlace
            );
            if (regularMatches.length === 0) return null;

            return (
              <div key={round.name} className="flex flex-col gap-4">
                {/* Round label */}
                <div className="text-center">
                  <span className="inline-block text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted rounded-full px-3 py-1">
                    {round.name}
                  </span>
                </div>

                {/* Matches vertically centered within the round column */}
                <div
                  className="flex flex-col justify-around"
                  style={{
                    gap: `${Math.max(16, 32 * (mainRounds.length - ri))}px`,
                  }}
                >
                  {regularMatches.map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3rd place match */}
      {thirdPlaceMatch && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Partido por el tercer puesto
          </p>
          <MatchCard match={thirdPlaceMatch} />
        </div>
      )}
    </div>
  );
}
