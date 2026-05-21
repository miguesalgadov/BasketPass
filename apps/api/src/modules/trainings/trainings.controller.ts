import { Response } from 'express';
import { AuthenticatedRequest } from '@/middlewares/auth.middleware';
import { trainingsService } from './trainings.service';
import { createTrainingSchema, updateTrainingSchema } from './trainings.schema';

export const trainingsController = {
  async getAll(req: AuthenticatedRequest, res: Response) {
    const trainings = await trainingsService.getAll(req.user!.clubId, req.query.teamId as string);
    res.json({ success: true, data: trainings });
  },

  async getById(req: AuthenticatedRequest, res: Response) {
    const training = await trainingsService.getById(req.params.id, req.user!.clubId);
    res.json({ success: true, data: training });
  },

  async create(req: AuthenticatedRequest, res: Response) {
    const dto = createTrainingSchema.parse(req.body);
    const result = await trainingsService.create(dto);
    res.status(201).json({ success: true, data: result });
  },

  async update(req: AuthenticatedRequest, res: Response) {
    const dto = updateTrainingSchema.parse(req.body);
    const training = await trainingsService.update(req.params.id, req.user!.clubId, dto);
    res.json({ success: true, data: training });
  },

  async delete(req: AuthenticatedRequest, res: Response) {
    await trainingsService.delete(req.params.id, req.user!.clubId);
    res.json({ success: true, data: { message: 'Training deleted' } });
  },

  async deleteSeries(req: AuthenticatedRequest, res: Response) {
    const { groupId } = req.params;
    const fromDate = req.query.fromDate as string | undefined;
    const result = await trainingsService.deleteSeries(groupId, req.user!.clubId, fromDate);
    res.json({ success: true, data: { deleted: result.count } });
  },
};
