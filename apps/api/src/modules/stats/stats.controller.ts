import { Response } from 'express';
import { AuthenticatedRequest } from '@/middlewares/auth.middleware';
import { statsService as svc } from './stats.service';
import {
  bulkStatsSchema,
  createSessionSchema,
  addLineupSchema,
  logActionSchema,
  assignStatSchema,
  updateClockSchema,
} from './stats.schema';

// ── Legacy controllers ────────────────────────────────────────────────────────

export const statsController = {
  async recordMatchStats(req: AuthenticatedRequest, res: Response) {
    const dto = bulkStatsSchema.parse(req.body);
    const stats = await svc.recordMatchStats(dto);
    res.json({ success: true, data: stats });
  },

  async getMatchStats(req: AuthenticatedRequest, res: Response) {
    const stats = await svc.getMatchStats(req.params.matchId);
    res.json({ success: true, data: stats });
  },

  async getPlayerStats(req: AuthenticatedRequest, res: Response) {
    const [stats, averages] = await Promise.all([
      svc.getPlayerStats(req.params.playerId),
      svc.getPlayerAverages(req.params.playerId),
    ]);
    res.json({ success: true, data: { stats, averages } });
  },

  async getTeamLeaderboard(req: AuthenticatedRequest, res: Response) {
    const { teamId } = req.query;
    if (!teamId) {
      res
        .status(400)
        .json({ success: false, error: { message: 'teamId required' } });
      return;
    }
    const data = await svc.getTeamLeaderboard(teamId as string);
    res.json({ success: true, data });
  },

  // ── Match discovery ────────────────────────────────────────────────────────

  async getUpcomingMatches(req: AuthenticatedRequest, res: Response) {
    const clubId = req.user!.clubId;
    const data = await svc.getUpcomingMatches(clubId!);
    res.json({ success: true, data });
  },

  async createFriendly(req: AuthenticatedRequest, res: Response) {
    const { homeTeamName, awayTeamName, homeTeamId, awayTeamId } = req.body;
    if (!homeTeamName || !awayTeamName) {
      res.status(400).json({ success: false, error: { message: 'homeTeamName y awayTeamName son requeridos' } });
      return;
    }
    const data = await svc.createFriendly(req.user!.id, homeTeamName, awayTeamName, homeTeamId, awayTeamId);
    res.status(201).json({ success: true, data });
  },

  async getRoster(req: AuthenticatedRequest, res: Response) {
    const data = await svc.getRoster(req.params.sid);
    res.json({ success: true, data });
  },

  async bulkAddLineup(req: AuthenticatedRequest, res: Response) {
    const { players } = req.body;
    if (!Array.isArray(players)) {
      res.status(400).json({ success: false, error: { message: 'players array is required' } });
      return;
    }
    const data = await svc.bulkAddLineup(req.params.sid, players);
    res.status(201).json({ success: true, data });
  },

  // ── Live-stats session controllers ─────────────────────────────────────────

  async createSession(req: AuthenticatedRequest, res: Response) {
    const dto = createSessionSchema.parse(req.body);
    const data = await svc.createSession(req.user!.id, dto);
    res.status(201).json({ success: true, data });
  },

  async getSession(req: AuthenticatedRequest, res: Response) {
    const data = await svc.getSession(req.params.sid);
    res.json({ success: true, data });
  },

  async getSessionByMatch(req: AuthenticatedRequest, res: Response) {
    const data = await svc.getSessionByMatchId(req.params.matchId);
    res.json({ success: true, data });
  },

  async startSession(req: AuthenticatedRequest, res: Response) {
    const data = await svc.startSession(req.params.sid);
    res.json({ success: true, data });
  },

  async finishSession(req: AuthenticatedRequest, res: Response) {
    const data = await svc.finishSession(req.params.sid);
    res.json({ success: true, data });
  },

  async addLineup(req: AuthenticatedRequest, res: Response) {
    const dto = addLineupSchema.parse(req.body);
    const data = await svc.addLineup(req.params.sid, dto);
    res.status(201).json({ success: true, data });
  },

  async getLineups(req: AuthenticatedRequest, res: Response) {
    const data = await svc.getLineups(req.params.sid);
    res.json({ success: true, data });
  },

  async patchLineup(req: AuthenticatedRequest, res: Response) {
    const { isStarter, isOnCourt } = req.body;
    const data = await svc.patchLineup(req.params.lineupId, { isStarter, isOnCourt });
    res.json({ success: true, data });
  },

  async logAction(req: AuthenticatedRequest, res: Response) {
    const dto = logActionSchema.parse(req.body);
    const data = await svc.logAction(req.params.sid, dto);
    res.json({ success: true, data });
  },

  async undoAction(req: AuthenticatedRequest, res: Response) {
    const data = await svc.undoLastAction(req.params.sid, req.user!.id);
    res.json({ success: true, data });
  },

  async advancePeriod(req: AuthenticatedRequest, res: Response) {
    const data = await svc.advancePeriod(req.params.sid);
    res.json({ success: true, data });
  },

  async updateClock(req: AuthenticatedRequest, res: Response) {
    const dto = updateClockSchema.parse(req.body);
    const data = await svc.updateClock(req.params.sid, dto.clockSeconds);
    res.json({ success: true, data });
  },

  async getBoxScore(req: AuthenticatedRequest, res: Response) {
    const data = await svc.getBoxScore(req.params.sid);
    res.json({ success: true, data });
  },

  async getShotChart(req: AuthenticatedRequest, res: Response) {
    const data = await svc.getShotChart(req.params.sid);
    res.json({ success: true, data });
  },

  async getPlays(req: AuthenticatedRequest, res: Response) {
    const data = await svc.getPlays(req.params.sid);
    res.json({ success: true, data });
  },

  async getAnalysis(req: AuthenticatedRequest, res: Response) {
    const data = await svc.getAnalysis(req.params.sid);
    res.json({ success: true, data });
  },

  async triggerAnalysis(req: AuthenticatedRequest, res: Response) {
    const data = await svc.triggerAnalysis(req.params.sid);
    res.json({ success: true, data });
  },

  async exportCSV(req: AuthenticatedRequest, res: Response) {
    const csv = await svc.exportCSV(req.params.sid);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="boxscore-${req.params.sid}.csv"`,
    );
    res.send(csv);
  },

  async assignStatistician(req: AuthenticatedRequest, res: Response) {
    const dto = assignStatSchema.parse(req.body);
    const data = await svc.assignStatistician(req.user!.id, dto);
    res.status(201).json({ success: true, data });
  },
};
