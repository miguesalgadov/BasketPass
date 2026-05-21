import { z } from 'zod';

export const createFeeTypeSchema = z.object({
  name:          z.string().min(1).max(100),
  amount:        z.coerce.number().positive(),
  currency:      z.string().default('CLP'),
  isRecurring:   z.boolean().default(true),
  dueDayOfMonth: z.coerce.number().int().min(1).max(28).default(5),
});

export const updateFeeTypeSchema = createFeeTypeSchema.partial();

export type CreateFeeTypeDto = z.infer<typeof createFeeTypeSchema>;
export type UpdateFeeTypeDto = z.infer<typeof updateFeeTypeSchema>;
