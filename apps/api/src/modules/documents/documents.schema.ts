import { z } from 'zod';

export const createDocumentSchema = z.object({
  title:    z.string().min(1).max(200),
  fileUrl:  z.string().url(),
  type:     z.enum(['DNI', 'FICHA_MEDICA', 'CONTRATO', 'SEGURO', 'AUTORIZACION', 'OTRO']),
  playerId: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

export type CreateDocumentDto = z.infer<typeof createDocumentSchema>;
