import { Router } from 'express';
import { teamsController } from './teams.controller';
import { requireRole } from '@/middlewares/rbac.middleware';

const router = Router();

router.get('/coaches', teamsController.getCoaches);
router.get('/search',  teamsController.search);
router.get('/', teamsController.getAll);
router.get('/:id', teamsController.getById);
router.post('/', requireRole('CLUB_ADMIN'), teamsController.create);
router.patch('/:id', requireRole('CLUB_ADMIN'), teamsController.update);
router.delete('/:id', requireRole('CLUB_ADMIN'), teamsController.delete);

export default router;
