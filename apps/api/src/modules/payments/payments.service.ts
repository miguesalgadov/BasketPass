import { paymentsRepository } from './payments.repository';
import { CreatePaymentDto, PaymentStatus } from './payments.schema';
import { logger } from '@/config/logger';

export const paymentsService = {
  getAll: (clubId: string, filters?: { playerId?: string; status?: PaymentStatus }) =>
    paymentsRepository.findAll(clubId, filters),

  async getById(id: string, clubId: string) {
    const payment = await paymentsRepository.findById(id, clubId);
    if (!payment) {
      const err = new Error('Payment not found');
      (err as any).statusCode = 404;
      throw err;
    }
    return payment;
  },

  create: (clubId: string, dto: CreatePaymentDto) =>
    paymentsRepository.create(clubId, dto),

  async updateStatus(id: string, clubId: string, status: PaymentStatus, paidAt?: string) {
    await paymentsService.getById(id, clubId);
    return paymentsRepository.updateStatus(id, status, paidAt ? new Date(paidAt) : undefined);
  },

  async handleMpWebhook(paymentId: string) {
    logger.info('Processing MercadoPago webhook', { paymentId });
    // MP API call would go here in production
    // For now, find payment by mpPaymentId and update status
  },
};
