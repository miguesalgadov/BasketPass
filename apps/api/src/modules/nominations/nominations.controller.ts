import { Response } from 'express';
import { AuthenticatedRequest } from '@/middlewares/auth.middleware';
import { nominationsService as svc } from './nominations.service';

export const nominationsController = {
  async getUpcoming(req: AuthenticatedRequest, res: Response) {
    const data = await svc.getUpcomingMatches(req.user!.id);
    res.json({ success: true, data });
  },

  async getNomination(req: AuthenticatedRequest, res: Response) {
    const { matchId } = req.params;
    const { teamId } = req.query as { teamId: string };
    if (!teamId) { res.status(400).json({ success: false, error: { message: 'teamId required' } }); return; }
    const data = await svc.getNomination(matchId, teamId);
    res.json({ success: true, data });
  },

  async upsertNomination(req: AuthenticatedRequest, res: Response) {
    const { matchId } = req.params;
    const { teamId, playerIds, notes, jerseyColor, sockColor } = req.body;
    if (!teamId || !Array.isArray(playerIds)) {
      res.status(400).json({ success: false, error: { message: 'teamId y playerIds requeridos' } });
      return;
    }
    const data = await svc.upsertNomination(matchId, teamId, req.user!.id, playerIds, notes, jerseyColor, sockColor);
    res.json({ success: true, data });
  },

  async markWhatsapp(req: AuthenticatedRequest, res: Response) {
    const { matchId } = req.params;
    const { teamId } = req.body;
    if (!teamId) { res.status(400).json({ success: false, error: { message: 'teamId required' } }); return; }
    const data = await svc.markWhatsappSent(matchId, teamId);
    res.json({ success: true, data });
  },

  async getRoster(req: AuthenticatedRequest, res: Response) {
    const data = await svc.getTeamRoster(req.params.teamId);
    res.json({ success: true, data });
  },
};
