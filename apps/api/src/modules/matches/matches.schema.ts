import { z } from 'zod';

export const createMatchSchema = z.object({
  teamId: z.string(),
  opponent: z.string().min(1).max(100),
  date: z.string().datetime(),
  location: z.string().optional(),
  isHome: z.boolean().default(true),
  notes: z.string().optional(),
});

export const updateMatchSchema = createMatchSchema.partial().extend({
  scoreHome: z.number().int().min(0).optional(),
  scoreAway: z.number().int().min(0).optional(),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']).optional(),
});

export type CreateMatchDto = z.infer<typeof createMatchSchema>;
export type UpdateMatchDto = z.infer<typeof updateMatchSchema>;
