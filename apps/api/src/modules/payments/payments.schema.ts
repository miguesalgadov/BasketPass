import { z } from 'zod';

export const PaymentStatusEnum = z.enum(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED']);
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;

export const createPaymentSchema = z.object({
  playerId: z.string().optional(),
  amount: z.number().positive(),
  currency: z.string().default('ARS'),
  concept: z.string().min(1).max(200),
  dueDate: z.string().datetime().optional(),
});

export const updatePaymentStatusSchema = z.object({
  status: PaymentStatusEnum,
  paidAt: z.string().datetime().optional(),
});

export const mpWebhookSchema = z.object({
  id: z.number(),
  type: z.string(),
  data: z.object({ id: z.string() }),
});

export type CreatePaymentDto = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentStatusDto = z.infer<typeof updatePaymentStatusSchema>;
