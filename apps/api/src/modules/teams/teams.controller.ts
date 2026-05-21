import { Response } from 'express';
import { AuthenticatedRequest } from '@/middlewares/auth.middleware';
import { teamsService } from './teams.service';
import { createTeamSchema, updateTeamSchema } from './teams.schema';

export const teamsController = {
  async getAll(req: AuthenticatedRequest, res: Response) {
    const teams = await teamsService.getAll(req.user!.clubId);
    res.json({ success: true, data: teams });
  },

  async getById(req: AuthenticatedRequest, res: Response) {
    const team = await teamsService.getById(req.params.id, req.user!.clubId);
    res.json({ success: true, data: team });
  },

  async create(req: AuthenticatedRequest, res: Response) {
    const dto = createTeamSchema.parse(req.body);
    const team = await teamsService.create(req.user!.clubId, dto);
    res.status(201).json({ success: true, data: team });
  },

  async update(req: AuthenticatedRequest, res: Response) {
    const dto = updateTeamSchema.parse(req.body);
    const team = await teamsService.update(req.params.id, req.user!.clubId, dto);
    res.json({ success: true, data: team });
  },

  async delete(req: AuthenticatedRequest, res: Response) {
    await teamsService.delete(req.params.id, req.user!.clubId);
    res.json({ success: true, data: { message: 'Team deleted' } });
  },

  async getCoaches(req: AuthenticatedRequest, res: Response) {
    const coaches = await teamsService.getCoaches(req.user!.clubId);
    res.json({ success: true, data: coaches });
  },

  async search(req: AuthenticatedRequest, res: Response) {
    const q = (req.query.q as string) ?? '';
    const { prisma } = await import('@/config/database');
    const teams = await prisma.team.findMany({
      where: {
        isActive: true,
        name: { contains: q },
      },
      select: {
        id: true, name: true, category: true,
        club: { select: { name: true } },
      },
      take: 20,
    });
    const data = teams.map(t => ({
      id: t.id,
      name: t.name,
      short: t.name.slice(0, 3).toUpperCase(),
      category: t.category,
      city: t.club?.name ?? '',
    }));
    res.json({ success: true, data });
  },
};
