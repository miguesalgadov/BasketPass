import { Router } from 'express';
import { attendanceController } from './attendance.controller';
import { requireRole } from '@/middlewares/rbac.middleware';

const router = Router();

router.post('/', requireRole('CLUB_ADMIN', 'COACH'), attendanceController.record);
router.get('/session/:sessionId', attendanceController.getBySession);
router.get('/stats/club', requireRole('CLUB_ADMIN', 'COACH'), attendanceController.getClubStats);
router.get('/player/:playerId/stats', attendanceController.getPlayerStats);

export default router;
