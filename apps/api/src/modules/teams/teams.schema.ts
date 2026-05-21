import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().min(1).max(50),
  coachId: z.string().optional(),
  season: z.string().min(4).max(20),
});

export const updateTeamSchema = createTeamSchema.partial();

export type CreateTeamDto = z.infer<typeof createTeamSchema>;
export type UpdateTeamDto = z.infer<typeof updateTeamSchema>;
