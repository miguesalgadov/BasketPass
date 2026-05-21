import { z } from 'zod';

export const createTrainingSchema = z.object({
  teamId:     z.string(),
  date:       z.string().datetime(),
  duration:   z.coerce.number().int().min(15).max(300),
  location:   z.string().optional(),
  plan:       z.string().optional(),
  coachNotes: z.string().optional(),
  // Recurrencia
  recurrent:         z.boolean().optional(),
  daysOfWeek:        z.array(z.number().int().min(0).max(6)).optional(), // 0=Dom … 6=Sáb
  recurrenceEndDate: z.string().optional(), // ISO date YYYY-MM-DD
});

export const updateTrainingSchema = createTrainingSchema
  .omit({ recurrent: true, daysOfWeek: true, recurrenceEndDate: true })
  .partial();

export type CreateTrainingDto = z.infer<typeof createTrainingSchema>;
export type UpdateTrainingDto = z.infer<typeof updateTrainingSchema>;
