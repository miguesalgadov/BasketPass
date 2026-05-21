'use client';

import { createContext, useContext } from 'react';

export type ChampionshipStatus =
  | 'DRAFT'
  | 'REGISTRATION'
  | 'ACTIVE'
  | 'REGULAR_SEASON'
  | 'PLAYOFFS'
  | 'FINISHED'
  | 'CANCELLED';

export type ChampionshipFormat =
  | 'SINGLE_ROUND_ROBIN'
  | 'DOUBLE_ROUND_ROBIN'
  | 'GROUPS_THEN_PLAYOFFS'
  | 'CUP';

export interface Championship {
  id: string;
  name: string;
  category: string;
  season: string;
  organizer?: string;
  format: ChampionshipFormat;
  scoringSystem: 'FIBA' | 'CLASSIC';
  status: ChampionshipStatus;
  hasPlayoffs: boolean;
  playoffTeams?: number;
  hasThirdPlace?: boolean;
  startDate?: string;
  maxTeams: number;
  numGroups?: number;
  teamsQualifyPerGroup?: number;
  fixtureGeneratedAt?: string;
}

export interface ChampionshipContextValue {
  championship: Championship | null;
  loading: boolean;
  refresh: () => void;
}

export const ChampionshipContext = createContext<ChampionshipContextValue>({
  championship: null,
  loading: true,
  refresh: () => {},
});

export function useChampionship() {
  return useContext(ChampionshipContext);
}
