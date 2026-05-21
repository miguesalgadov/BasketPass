import { Router } from 'express';
import { requireRole } from '@/middlewares/rbac.middleware';
import { championshipsController as ctrl } from './championships.controller';

const router = Router();
const adminOnly  = requireRole('CLUB_ADMIN');
const staffOnly  = requireRole('CLUB_ADMIN', 'COACH');

router.get('/',    ctrl.list);
router.post('/',   adminOnly, ctrl.create);

router.get('/:id',        ctrl.getById);
router.patch('/:id',      adminOnly, ctrl.update);
router.delete('/:id',     adminOnly, ctrl.delete);
router.post('/:id/start', adminOnly, ctrl.start);

router.post('/:id/participants',      staffOnly, ctrl.addParticipant);
router.delete('/:id/participants/:pid', adminOnly, ctrl.removeParticipant);
router.post('/:id/generate-fixture',  adminOnly, ctrl.generateFixture);

router.get('/:id/rounds',            ctrl.getRounds);
router.patch('/:id/matches/:mid',             staffOnly, ctrl.loadResult);
router.patch('/:id/matches/:mid/schedule',    staffOnly, ctrl.patchMatchSchedule);
router.post('/:id/matches/:mid/walkover',     adminOnly, ctrl.loadWalkover);
router.post('/:id/matches/:mid/stats',        staffOnly, ctrl.loadStats);

router.get('/:id/standings',         ctrl.getStandings);

router.post('/:id/generate-bracket', adminOnly, ctrl.generateBracket);
router.get('/:id/bracket',           ctrl.getBracket);

router.get('/:id/stats/leaders',     ctrl.getLeaders);

export default router;
