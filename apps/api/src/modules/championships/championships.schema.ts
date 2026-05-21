import { z } from 'zod';

export const createChampionshipSchema = z.object({
  name:               z.string().min(3).max(100),
  category:           z.string().min(1),
  season:             z.string().regex(/^\d{4}$/).default(() => String(new Date().getFullYear())),
  organizer:          z.string().optional(),
  numTeams:             z.number().int().min(3).max(32).default(8),
  format:               z.enum(['SINGLE_ROUND_ROBIN', 'DOUBLE_ROUND_ROBIN', 'GROUPS_THEN_PLAYOFFS', 'CUP']).default('DOUBLE_ROUND_ROBIN'),
  numGroups:            z.number().int().min(2).max(16).default(2),
  teamsQualifyPerGroup: z.number().int().min(1).max(8).default(2),
  scoringSystem:      z.enum(['FIBA', 'CLASSIC']).default('FIBA'),
  hasPlayoffs:        z.boolean().default(true),
  playoffTeams:       z.number().int().min(2).max(16).default(4),
  playoffFormat:      z.enum(['SINGLE_ELIMINATION', 'BEST_OF_3', 'BEST_OF_5']).default('SINGLE_ELIMINATION'),
  playoffSeries:      z.number().int().default(1),
  hasThirdPlace:      z.boolean().default(true),
  playoffSeeding:     z.enum(['FIBA_STANDARD', 'RANDOM']).default('FIBA_STANDARD'),
  startDate:          z.string().optional(),
  endDate:            z.string().optional(),
  daysBetweenRounds:  z.number().int().min(1).default(7),
  defaultVenue:       z.string().optional(),
  walkoverScore:      z.number().int().min(1).default(20),
  walkoverWaitMins:   z.number().int().min(0).default(15),
  maxForeignPlayers:  z.number().int().min(0).optional(),
  teams:              z.array(z.object({
    isExternal:     z.boolean().default(false),
    teamId:         z.string().optional(),
    externalName:   z.string().optional(),
    externalShort:  z.string().max(3).optional(),
    externalCity:   z.string().optional(),
    externalContact: z.string().optional(),
  })).default([]),
});

export const updateChampionshipSchema = createChampionshipSchema.partial();

export const addParticipantSchema = z.object({
  teamId:          z.string().optional(),
  externalName:    z.string().optional(),
  externalShort:   z.string().max(3).optional(),
  externalCity:    z.string().optional(),
  externalContact: z.string().optional(),
  isExternal:      z.boolean().default(false),
}).refine(d => d.teamId || d.externalName, { message: 'teamId or externalName required' });

export const generateFixtureSchema = z.object({
  startDate:          z.string(),
  daysBetweenRounds:  z.number().int().min(1).default(7),
});

export const loadResultSchema = z.object({
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
  homeQ1: z.number().int().min(0).optional(),
  homeQ2: z.number().int().min(0).optional(),
  homeQ3: z.number().int().min(0).optional(),
  homeQ4: z.number().int().min(0).optional(),
  homeOT: z.number().int().min(0).optional(),
  awayQ1: z.number().int().min(0).optional(),
  awayQ2: z.number().int().min(0).optional(),
  awayQ3: z.number().int().min(0).optional(),
  awayQ4: z.number().int().min(0).optional(),
  awayOT: z.number().int().min(0).optional(),
});

export const walkoverSchema = z.object({
  walkoverTeamId: z.string(),
});

export const deleteChampionshipSchema = z.object({
  confirmName:   z.string(),
  deleteReason:  z.string().optional(),
});

export const champPlayerStatSchema = z.object({
  playerId:          z.string(),
  teamParticipantId: z.string(),
  minutes:           z.number().int().min(0).default(0),
  points:            z.number().int().min(0).default(0),
  fg2Made:           z.number().int().min(0).default(0),
  fg2Attempted:      z.number().int().min(0).default(0),
  fg3Made:           z.number().int().min(0).default(0),
  fg3Attempted:      z.number().int().min(0).default(0),
  ftMade:            z.number().int().min(0).default(0),
  ftAttempted:       z.number().int().min(0).default(0),
  offRebounds:       z.number().int().min(0).default(0),
  defRebounds:       z.number().int().min(0).default(0),
  assists:           z.number().int().min(0).default(0),
  steals:            z.number().int().min(0).default(0),
  blocks:            z.number().int().min(0).default(0),
  turnovers:         z.number().int().min(0).default(0),
  foulsPersonal:     z.number().int().min(0).max(5).default(0),
  foulsTechnical:    z.number().int().min(0).default(0),
  plusMinus:         z.number().int().default(0),
  didNotPlay:        z.boolean().default(false),
  dnpReason:         z.string().optional(),
});

export const loadStatsSchema = z.object({
  stats: z.array(champPlayerStatSchema),
});

export type CreateChampionshipDto     = z.infer<typeof createChampionshipSchema>;
export type UpdateChampionshipDto     = z.infer<typeof updateChampionshipSchema>;
export type AddParticipantDto         = z.infer<typeof addParticipantSchema>;
export type GenerateFixtureDto        = z.infer<typeof generateFixtureSchema>;
export type LoadResultDto             = z.infer<typeof loadResultSchema>;
export type WalkoverDto               = z.infer<typeof walkoverSchema>;
export type DeleteChampionshipDto     = z.infer<typeof deleteChampionshipSchema>;
export type LoadStatsDto              = z.infer<typeof loadStatsSchema>;

export const patchMatchScheduleSchema = z.object({
  scheduledAt: z.string().optional(),
  venue:       z.string().optional(),
  homeTeamId:  z.string().optional(),
  awayTeamId:  z.string().optional(),
}).refine(d => !d.homeTeamId || !d.awayTeamId || d.homeTeamId !== d.awayTeamId, {
  message: 'Local y visitante deben ser diferentes',
});
export type PatchMatchScheduleDto = z.infer<typeof patchMatchScheduleSchema>;
