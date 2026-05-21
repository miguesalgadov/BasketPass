export type ChampFormat = 'DOUBLE_ROUND_ROBIN' | 'SINGLE_ROUND_ROBIN' | 'GROUPS_THEN_PLAYOFFS' | 'CUP';
export type ScoringSystem = 'FIBA' | 'CLASSIC';
export type PlayoffFormat = 'SINGLE_ELIMINATION' | 'BEST_OF_3' | 'BEST_OF_5';
export type PlayoffSeeding = 'FIBA_STANDARD' | 'RANDOM';

export interface ParticipantInput {
  isExternal: boolean;
  teamId?: string;
  externalName?: string;
  externalShort?: string;
  externalCity?: string;
  externalContact?: string;
  // display helpers (not sent to API)
  displayName?: string;
  displayShort?: string;
  displayCity?: string;
  displayCat?: string;
}

export interface WizardData {
  // Step 1
  name: string;
  category: string;
  season: string;
  organizer: string;
  numTeams: number;
  format: ChampFormat;
  numGroups: number;
  teamsQualifyPerGroup: number;
  // Step 2
  teams: ParticipantInput[];
  // Step 3
  scoringSystem: ScoringSystem;
  hasPlayoffs: boolean;
  playoffTeams: number;
  playoffFormat: PlayoffFormat;
  playoffSeries: number;
  hasThirdPlace: boolean;
  playoffSeeding: PlayoffSeeding;
  startDate: string;
  daysBetweenRounds: number;
  defaultVenue: string;
  walkoverScore: number;
  walkoverWaitMins: number;
  maxForeignPlayers?: number;
}

export const WIZARD_INITIAL: WizardData = {
  name: '',
  category: '',
  season: new Date().getFullYear().toString(),
  organizer: '',
  numTeams: 8,
  format: 'DOUBLE_ROUND_ROBIN',
  numGroups: 2,
  teamsQualifyPerGroup: 2,
  teams: [],
  scoringSystem: 'FIBA',
  hasPlayoffs: true,
  playoffTeams: 4,
  playoffFormat: 'SINGLE_ELIMINATION',
  playoffSeries: 1,
  hasThirdPlace: true,
  playoffSeeding: 'FIBA_STANDARD',
  startDate: '',
  daysBetweenRounds: 7,
  defaultVenue: '',
  walkoverScore: 20,
  walkoverWaitMins: 15,
};

export const CATEGORY_OPTIONS = [
  'Masculino Mayor', 'Femenino Mayor', 'Sub-23 Masculino', 'Sub-23 Femenino',
  'Sub-21 Masculino', 'Sub-21 Femenino', 'Sub-18 Masculino', 'Sub-18 Femenino',
  'Sub-16 Masculino', 'Sub-16 Femenino', 'Sub-14 Masculino', 'Sub-14 Femenino',
  'Mixto', 'Masters', 'Otro',
];

export const NUM_TEAMS_OPTIONS = [4, 6, 8, 10, 12, 16];

export const FORMAT_LABELS: Record<ChampFormat, string> = {
  DOUBLE_ROUND_ROBIN: 'Ida y vuelta (todos vs todos x2)',
  SINGLE_ROUND_ROBIN: 'Solo ida (todos vs todos x1)',
  GROUPS_THEN_PLAYOFFS: 'Fase de grupos + eliminatorias',
  CUP: 'Copa (eliminación directa)',
};
