import { Router } from 'express';
import { requireRole } from '@/middlewares/rbac.middleware';
import { feeTypesController } from './fee-types.controller';

const router = Router();

router.get('/',     feeTypesController.getAll);
router.post('/',    requireRole('CLUB_ADMIN'), feeTypesController.create);
router.get('/:id',  feeTypesController.getById);
router.patch('/:id', requireRole('CLUB_ADMIN'), feeTypesController.update);
router.delete('/:id', requireRole('CLUB_ADMIN'), feeTypesController.delete);

export default router;
