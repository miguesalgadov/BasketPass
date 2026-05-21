import { Response } from 'express';
import { AuthenticatedRequest } from '@/middlewares/auth.middleware';
import { matchesService } from './matches.service';
import { createMatchSchema, updateMatchSchema } from './matches.schema';

export const matchesController = {
  async getAll(req: AuthenticatedRequest, res: Response) {
    const matches = await matchesService.getAll(req.user!.clubId, req.query.teamId as string);
    res.json({ success: true, data: matches });
  },

  async getById(req: AuthenticatedRequest, res: Response) {
    const match = await matchesService.getById(req.params.id, req.user!.clubId);
    res.json({ success: true, data: match });
  },

  async create(req: AuthenticatedRequest, res: Response) {
    const dto = createMatchSchema.parse(req.body);
    const match = await matchesService.create(dto);
    res.status(201).json({ success: true, data: match });
  },

  async update(req: AuthenticatedRequest, res: Response) {
    const dto = updateMatchSchema.parse(req.body);
    const match = await matchesService.update(req.params.id, req.user!.clubId, dto);
    res.json({ success: true, data: match });
  },

  async delete(req: AuthenticatedRequest, res: Response) {
    await matchesService.delete(req.params.id, req.user!.clubId);
    res.json({ success: true, data: { message: 'Match deleted' } });
  },
};
