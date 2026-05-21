import { z } from 'zod';

// ── Legacy schemas (kept for backward compatibility) ──────────────────────────

export const playerStatsSchema = z.object({
  playerId: z.string(),
  matchId: z.string(),
  points: z.number().int().min(0).default(0),
  rebounds: z.number().int().min(0).default(0),
  assists: z.number().int().min(0).default(0),
  steals: z.number().int().min(0).default(0),
  blocks: z.number().int().min(0).default(0),
  turnovers: z.number().int().min(0).default(0),
  fouls: z.number().int().min(0).max(6).default(0),
  minutes: z.number().int().min(0).max(48).default(0),
  freeThrowsMade: z.number().int().min(0).default(0),
  freeThrowsAttempted: z.number().int().min(0).default(0),
});

export const bulkStatsSchema = z.object({
  matchId: z.string(),
  stats: z.array(playerStatsSchema.omit({ matchId: true })),
});

export type PlayerStatsDto = z.infer<typeof playerStatsSchema>;
export type BulkStatsDto = z.infer<typeof bulkStatsSchema>;

// ── New live-stats schemas ─────────────────────────────────────────────────────

export const createSessionSchema = z.object({
  matchId: z.string(),
  championshipId: z.string().optional(),
});

export const addLineupSchema = z.object({
  participantId: z.string(),
  playerId: z.string().optional(),
  externalPlayerName: z.string().optional(),
  externalPlayerNumber: z.number().int().optional(),
  isStarter: z.boolean().default(false),
  jerseyNumber: z.number().int().optional(),
  position: z.enum(['PG', 'SG', 'SF', 'PF', 'C']).optional(),
});

export const logActionSchema = z.object({
  lineupId: z.string(),
  actionType: z.enum([
    'FG2_MADE',
    'FG2_MISSED',
    'FG3_MADE',
    'FG3_MISSED',
    'FT_MADE',
    'FT_MISSED',
    'OFF_REBOUND',
    'DEF_REBOUND',
    'ASSIST',
    'STEAL',
    'BLOCK',
    'TURNOVER',
    'PERSONAL_FOUL',
    'TECHNICAL_FOUL',
    'UNSPORTSMANLIKE_FOUL',
    'DRAW_FOUL',
    'SUBSTITUTION_IN',
    'SUBSTITUTION_OUT',
    'TIMEOUT',
    'PERIOD_END',
    'PERIOD_START',
  ]),
  team: z.enum(['home', 'away']),
  playerId: z.string().optional(),
  courtX: z.number().min(0).max(100).optional(),
  courtY: z.number().min(0).max(100).optional(),
});

export const assignStatSchema = z.object({
  userId: z.string(),
  matchId: z.string(),
  championshipId: z.string().optional(),
});

export const updateClockSchema = z.object({
  clockSeconds: z.number().int().min(0),
  period: z.number().int().min(1).optional(),
});

export type CreateSessionDto = z.infer<typeof createSessionSchema>;
export type AddLineupDto = z.infer<typeof addLineupSchema>;
export type LogActionDto = z.infer<typeof logActionSchema>;
export type AssignStatDto = z.infer<typeof assignStatSchema>;
export type UpdateClockDto = z.infer<typeof updateClockSchema>;
