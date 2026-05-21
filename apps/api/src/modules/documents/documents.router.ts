import { Router } from 'express';
import { documentsController } from './documents.controller';
import { requireRole } from '@/middlewares/rbac.middleware';

const router = Router();

router.get('/', documentsController.getAll);
router.post('/', requireRole('CLUB_ADMIN', 'COACH'), documentsController.create);
router.delete('/:id', requireRole('CLUB_ADMIN'), documentsController.delete);

export default router;
