import { Response } from 'express';
import { AuthenticatedRequest } from '@/middlewares/auth.middleware';
import { attendanceService } from './attendance.service';
import { bulkAttendanceSchema } from './attendance.schema';

export const attendanceController = {
  async record(req: AuthenticatedRequest, res: Response) {
    const dto = bulkAttendanceSchema.parse(req.body);
    const result = await attendanceService.record(dto);
    res.json({ success: true, data: result });
  },

  async getBySession(req: AuthenticatedRequest, res: Response) {
    const { sessionId } = req.params;
    const sessionType = req.query.type as 'match' | 'training';
    const result = await attendanceService.getBySession(sessionId, sessionType || 'training');
    res.json({ success: true, data: result });
  },

  async getPlayerStats(req: AuthenticatedRequest, res: Response) {
    const stats = await attendanceService.getPlayerStats(req.params.playerId);
    res.json({ success: true, data: stats });
  },

  async getClubStats(req: AuthenticatedRequest, res: Response) {
    const stats = await attendanceService.getClubStats(req.user!.clubId);
    res.json({ success: true, data: stats });
  },
};
