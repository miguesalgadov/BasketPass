import { z } from 'zod';

export const FEE_STATUSES = ['PENDING', 'PAID', 'OVERDUE', 'NOT_ENROLLED', 'INJURED', 'EXEMPT', 'CANCELLED'] as const;
export const PAYMENT_METHODS = ['CASH', 'TRANSFER', 'MERCADOPAGO', 'CHEQUE', 'OTHER'] as const;

export type FeeStatus    = typeof FEE_STATUSES[number];
export type PaymentMethod = typeof PAYMENT_METHODS[number];

export const createFeeSchema = z.object({
  playerId:  z.string().min(1),
  feeTypeId: z.string().min(1),
  year:      z.coerce.number().int().min(2020).max(2100),
  month:     z.coerce.number().int().min(1).max(12),
  amount:    z.coerce.number().positive().optional(),
  notes:     z.string().optional(),
});

export const updateFeeSchema = z.object({
  amount:    z.coerce.number().positive().optional(),
  notes:     z.string().optional(),
  status:    z.enum(FEE_STATUSES).optional(),
});

export const payFeeSchema = z.object({
  paidAmount:    z.coerce.number().positive(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  notes:         z.string().optional(),
});

export const generateMonthlySchema = z.object({
  year:  z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export const generateYearSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
});

export const bulkUpdateFeeSchema = z.object({
  feeIds: z.array(z.string().min(1)).min(1).max(500),
  status: z.enum(FEE_STATUSES),
  notes:  z.string().optional(),
});
export type BulkUpdateFeeDto = z.infer<typeof bulkUpdateFeeSchema>;

export const bulkDeleteFeeSchema = z.object({
  feeIds: z.array(z.string().min(1)).min(1).max(500),
});
export type BulkDeleteFeeDto = z.infer<typeof bulkDeleteFeeSchema>;

export type CreateFeeDto       = z.infer<typeof createFeeSchema>;
export type UpdateFeeDto       = z.infer<typeof updateFeeSchema>;
export type PayFeeDto          = z.infer<typeof payFeeSchema>;
export type GenerateMonthlyDto = z.infer<typeof generateMonthlySchema>;
