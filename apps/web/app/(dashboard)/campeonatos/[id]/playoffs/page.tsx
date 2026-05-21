'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { GitBranch, Loader2, Play } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useChampionship } from '../championship-context';
import {
  PlayoffBracket,
  type BracketRound,
  type BracketMatch,
} from '@/components/modules/championships/PlayoffBracket';
import toast from 'react-hot-toast';

function structureToRounds(structure: any): BracketRound[] {
  const toParticipant = (team: any, winnerId: string | null) => {
    if (!team) return {};
    return {
      teamId:   team.id,
      teamName: team.name,
      seed:     team.seed ?? undefined,
      score:    team.score ?? undefined,
      isWinner: winnerId != null && winnerId === team.id,
    };
  };
  const toMatch = (m: any, isThirdPlace = false): BracketMatch => ({
    id:          m.id,
    home:        toParticipant(m.team1, m.winnerId),
    away:        toParticipant(m.team2, m.winnerId),
    isThirdPlace: isThirdPlace || undefined,
  });

  const rounds: BracketRound[] = [];
  if (structure.quarterfinals?.length > 0)
    rounds.push({ name: 'Cuartos de final', matches: structure.quarterfinals.map((m: any) => toMatch(m)) });
  if (structure.semifinals?.length > 0)
    rounds.push({ name: 'Semifinales', matches: structure.semifinals.map((m: any) => toMatch(m)) });

  const finalMatches: BracketMatch[] = [];
  if (structure.final)      finalMatches.push(toMatch(structure.final));
  if (structure.thirdPlace) finalMatches.push(toMatch(structure.thirdPlace, true));
  if (finalMatches.length > 0)
    rounds.push({ name: 'Final', matches: finalMatches });

  return rounds;
}

export default function PlayoffsPage() {
  const params = useParams<{ id: string }>();
  const { championship } = useChampionship();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'CLUB_ADMIN' || user?.role === 'SUPER_ADMIN';

  const [bracket, setBracket] = useState<BracketRound[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchBracket = useCallback(async () => {
    try {
      const res = await api.get(`/championships/${params.id}/bracket`);
      const raw = res.data.data ?? res.data;
      if (raw?.structure) {
        setBracket(structureToRounds(raw.structure));
      } else if (Array.isArray(raw)) {
        setBracket(raw);
      } else {
        setBracket(null);
      }
    } catch (err: any) {
      // 404 means bracket doesn't exist yet — that's OK
      if (err.response?.status !== 404) {
        toast.error('Error al cargar bracket');
      }
      setBracket(null);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchBracket();
  }, [fetchBracket]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      await api.post(`/championships/${params.id}/generate-bracket`);
      toast.success('Bracket generado');
      fetchBracket();
    } catch (err: any) {
      toast.error(
        err.response?.data?.error?.message ?? 'Error al generar bracket'
      );
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border p-6 animate-pulse">
        <div className="flex gap-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-4 flex-1">
              <div className="h-4 bg-muted rounded w-24 mx-auto" />
              {Array.from({ length: Math.max(1, 4 >> i) }).map((_, j) => (
                <div key={j} className="h-20 bg-muted rounded-xl" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // No bracket yet
  if (!bracket || (Array.isArray(bracket) && bracket.length === 0)) {
    return (
      <div className="bg-surface rounded-xl border border-border p-12 text-center">
        <GitBranch
          className="mx-auto mb-3 text-muted-foreground"
          size={36}
        />
        <p className="font-medium text-secondary mb-1">
          No hay bracket generado
        </p>
        <p className="text-sm text-muted-foreground mb-5">
          {isAdmin && championship?.status === 'REGULAR_SEASON'
            ? 'Una vez finalizada la fase regular, generá el bracket de playoffs.'
            : 'El bracket de playoffs estará disponible cuando comience la fase eliminatoria.'}
        </p>
        {isAdmin && championship?.status === 'REGULAR_SEASON' && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-600 text-white font-semibold py-2 px-5 rounded-lg transition text-sm disabled:opacity-60"
          >
            {generating ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Play size={15} />
            )}
            Generar bracket
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface rounded-xl border border-border p-5">
        <PlayoffBracket rounds={bracket} />
      </div>
    </div>
  );
}
