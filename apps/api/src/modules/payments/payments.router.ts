import { Router } from 'express';
import { paymentsController } from './payments.controller';
import { requireRole } from '@/middlewares/rbac.middleware';

const router = Router();

router.get('/', paymentsController.getAll);
router.get('/:id', paymentsController.getById);
router.post('/', requireRole('CLUB_ADMIN'), paymentsController.create);
router.patch('/:id/status', requireRole('CLUB_ADMIN'), paymentsController.updateStatus);
router.post('/mercadopago/webhook', paymentsController.mpWebhook);

export default router;
