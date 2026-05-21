import { z } from 'zod';

export const createPlayerSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  phone: z.string().optional(),
  rut: z.string().optional(),
  teamId: z.string().optional(),
  jerseyNumber: z.number().int().min(0).max(99).optional(),
  position: z.enum(['PG', 'SG', 'SF', 'PF', 'C']).optional(),
  birthDate: z.string().datetime().optional(),
  height: z.number().min(100).max(250).optional(),
  weight: z.number().min(20).max(200).optional(),
  clothingSize: z.string().max(10).optional(),
});

export const updatePlayerSchema = createPlayerSchema.partial().omit({ email: true });

export const playerQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  teamId: z.string().optional(),
  position: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

export const importPlayerRowSchema = z.object({
  firstName:      z.string().min(1),
  lastName:       z.string().min(1),
  rut:            z.string().optional(),
  jerseyNumber:   z.number().int().min(0).max(99).optional(),
  birthDate:      z.string().optional(),
  emergencyPhone: z.string().optional(),
  position:       z.enum(['PG', 'SG', 'SF', 'PF', 'C']).optional(),
  categoria:      z.string().optional(),
  email:          z.preprocess((v) => (typeof v === 'string' ? v.trim().toLowerCase() || undefined : v), z.string().email().optional()),
  clothingSize:   z.string().max(10).optional(),
});

export const importPlayersSchema = z.object({
  players: z.array(importPlayerRowSchema).min(1).max(200),
  teamId:  z.string().optional(),
});

export type CreatePlayerDto   = z.infer<typeof createPlayerSchema>;
export type UpdatePlayerDto   = z.infer<typeof updatePlayerSchema>;
export type PlayerQuery        = z.infer<typeof playerQuerySchema>;
export type ImportPlayerRowDto = z.infer<typeof importPlayerRowSchema>;
export type ImportPlayersDto   = z.infer<typeof importPlayersSchema>;
