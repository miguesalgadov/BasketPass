import { Router } from 'express';
import { requireRole } from '@/middlewares/rbac.middleware';
import { feesController } from './fees.controller';

const router = Router();

// Specific paths must come before /:id
router.get('/me',                 feesController.getMyFees);
router.get('/matrix',             feesController.getMatrix);
router.post('/generate-monthly',  requireRole('CLUB_ADMIN'), feesController.generateMonthly);
router.post('/generate-year',     requireRole('CLUB_ADMIN'), feesController.generateYear);
router.post('/bulk-update',       requireRole('CLUB_ADMIN'), feesController.bulkUpdate);
router.post('/bulk-delete',       requireRole('CLUB_ADMIN'), feesController.bulkDelete);

router.get('/',     feesController.getAll);
router.post('/',    requireRole('CLUB_ADMIN', 'COACH'), feesController.create);

router.get('/:id',                feesController.getById);
router.patch('/:id',              requireRole('CLUB_ADMIN', 'COACH'), feesController.update);
router.delete('/:id',             requireRole('CLUB_ADMIN'), feesController.delete);
router.post('/:id/pay',           requireRole('CLUB_ADMIN', 'COACH'), feesController.pay);
router.post('/:id/mark-injured',  requireRole('CLUB_ADMIN', 'COACH'), feesController.markInjured);
router.post('/:id/mark-exempt',   requireRole('CLUB_ADMIN'), feesController.markExempt);
router.post('/:id/mark-not-enrolled', requireRole('CLUB_ADMIN'), feesController.markNotEnrolled);
router.post('/:id/remind',        requireRole('CLUB_ADMIN'), feesController.remind);

export default router;
