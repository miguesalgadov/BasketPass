import { Router } from 'express';
import { trainingsController } from './trainings.controller';
import { requireRole } from '@/middlewares/rbac.middleware';

const router = Router();

router.get('/', trainingsController.getAll);
router.post('/', requireRole('CLUB_ADMIN', 'COACH'), trainingsController.create);
router.delete('/series/:groupId', requireRole('CLUB_ADMIN', 'COACH'), trainingsController.deleteSeries);
router.get('/:id', trainingsController.getById);
router.patch('/:id', requireRole('CLUB_ADMIN', 'COACH'), trainingsController.update);
router.delete('/:id', requireRole('CLUB_ADMIN', 'COACH'), trainingsController.delete);

export default router;
