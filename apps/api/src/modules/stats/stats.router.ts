import { Router } from 'express';
import { requireRole } from '@/middlewares/rbac.middleware';
import { statsController as ctrl } from './stats.controller';

const router = Router();

const adminOnly = requireRole('CLUB_ADMIN', 'SUPER_ADMIN');
const staffOnly = requireRole(
  'CLUB_ADMIN',
  'SUPER_ADMIN',
  'COACH',
  'STATISTICIAN',
);

// ── Legacy routes (backwards-compatible) ─────────────────────────────────────
router.post('/match', requireRole('CLUB_ADMIN', 'COACH'), ctrl.recordMatchStats);
router.get('/match/:matchId', ctrl.getMatchStats);
router.get('/player/:playerId', ctrl.getPlayerStats);
router.get('/leaderboard', ctrl.getTeamLeaderboard);

// ── Match discovery ───────────────────────────────────────────────────────────
router.get('/matches', ctrl.getUpcomingMatches);
router.post('/matches/friendly', staffOnly, ctrl.createFriendly);

// ── Live-stats session routes ─────────────────────────────────────────────────
router.post('/sessions', adminOnly, ctrl.createSession);
router.get('/sessions/by-match/:matchId', ctrl.getSessionByMatch);
router.get('/sessions/:sid', ctrl.getSession);
router.post('/sessions/:sid/start', staffOnly, ctrl.startSession);
router.post('/sessions/:sid/finish', staffOnly, ctrl.finishSession);
router.post('/sessions/:sid/lineup', staffOnly, ctrl.addLineup);
router.post('/sessions/:sid/lineup/bulk', staffOnly, ctrl.bulkAddLineup);
router.get('/sessions/:sid/lineup', ctrl.getLineups);
router.patch('/sessions/:sid/lineup/:lineupId', staffOnly, ctrl.patchLineup);
router.get('/sessions/:sid/roster', staffOnly, ctrl.getRoster);
router.post('/sessions/:sid/actions', staffOnly, ctrl.logAction);
router.post('/sessions/:sid/undo', staffOnly, ctrl.undoAction);
router.post('/sessions/:sid/period', staffOnly, ctrl.advancePeriod);
router.patch('/sessions/:sid/clock', staffOnly, ctrl.updateClock);
router.get('/sessions/:sid/boxscore', ctrl.getBoxScore);
router.get('/sessions/:sid/shotchart', ctrl.getShotChart);
router.get('/sessions/:sid/plays', ctrl.getPlays);
router.get('/sessions/:sid/analysis', ctrl.getAnalysis);
router.post('/sessions/:sid/analysis', adminOnly, ctrl.triggerAnalysis);
router.get('/sessions/:sid/export/csv', staffOnly, ctrl.exportCSV);

// ── Assignments ───────────────────────────────────────────────────────────────
router.post('/assignments', adminOnly, ctrl.assignStatistician);

export default router;
