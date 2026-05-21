import { Router } from 'express';
import { matchesController } from './matches.controller';
import { requireRole } from '@/middlewares/rbac.middleware';

const router = Router();

router.get('/', matchesController.getAll);
router.get('/:id', matchesController.getById);
router.post('/', requireRole('CLUB_ADMIN', 'COACH'), matchesController.create);
router.patch('/:id', requireRole('CLUB_ADMIN', 'COACH'), matchesController.update);
router.delete('/:id', requireRole('CLUB_ADMIN', 'COACH'), matchesController.delete);

export default router;
