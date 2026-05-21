import { Response } from 'express';
import { AuthenticatedRequest } from '@/middlewares/auth.middleware';
import { feeTypesService } from './fee-types.service';
import { createFeeTypeSchema, updateFeeTypeSchema } from './fee-types.schema';

export const feeTypesController = {
  async getAll(req: AuthenticatedRequest, res: Response) {
    const data = await feeTypesService.getAll(req.user!.clubId);
    res.json({ success: true, data });
  },

  async getById(req: AuthenticatedRequest, res: Response) {
    const data = await feeTypesService.getById(req.params.id, req.user!.clubId);
    res.json({ success: true, data });
  },

  async create(req: AuthenticatedRequest, res: Response) {
    const dto = createFeeTypeSchema.parse(req.body);
    const data = await feeTypesService.create(req.user!.clubId, dto);
    res.status(201).json({ success: true, data });
  },

  async update(req: AuthenticatedRequest, res: Response) {
    const dto = updateFeeTypeSchema.parse(req.body);
    const data = await feeTypesService.update(req.params.id, req.user!.clubId, dto);
    res.json({ success: true, data });
  },

  async delete(req: AuthenticatedRequest, res: Response) {
    await feeTypesService.delete(req.params.id, req.user!.clubId);
    res.json({ success: true, data: { message: 'FeeType deactivated' } });
  },
};
