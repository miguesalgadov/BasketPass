import { Router } from 'express';
import { requireRole } from '@/middlewares/rbac.middleware';
import { nominationsController as ctrl } from './nominations.controller';

const router = Router();
const coachOnly = requireRole('COACH', 'CLUB_ADMIN', 'SUPER_ADMIN');

router.get('/upcoming', coachOnly, ctrl.getUpcoming);
router.get('/roster/:teamId', coachOnly, ctrl.getRoster);
router.get('/:matchId', coachOnly, ctrl.getNomination);
router.put('/:matchId', coachOnly, ctrl.upsertNomination);
router.post('/:matchId/whatsapp', coachOnly, ctrl.markWhatsapp);

export default router;
