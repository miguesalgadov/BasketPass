import { Response } from 'express';
import { AuthenticatedRequest } from '@/middlewares/auth.middleware';
import { championshipsService as svc } from './championships.service';
import {
  createChampionshipSchema, updateChampionshipSchema, addParticipantSchema,
  generateFixtureSchema, loadResultSchema, walkoverSchema, loadStatsSchema,
  deleteChampionshipSchema, patchMatchScheduleSchema,
} from './championships.schema';

export const championshipsController = {
  async list(req: AuthenticatedRequest, res: Response) {
    const data = await svc.list(req.user!.clubId);
    res.json({ success: true, data });
  },

  async getById(req: AuthenticatedRequest, res: Response) {
    const data = await svc.getById(req.params.id, req.user!.clubId);
    res.json({ success: true, data });
  },

  async create(req: AuthenticatedRequest, res: Response) {
    const dto = createChampionshipSchema.parse(req.body);
    const data = await svc.create(req.user!.clubId, req.user!.id, dto);
    res.status(201).json({ success: true, data });
  },

  async update(req: AuthenticatedRequest, res: Response) {
    const dto = updateChampionshipSchema.parse(req.body);
    const data = await svc.update(req.params.id, req.user!.clubId, dto);
    res.json({ success: true, data });
  },

  async delete(req: AuthenticatedRequest, res: Response) {
    const dto = deleteChampionshipSchema.parse(req.body);
    const data = await svc.delete(req.params.id, req.user!.clubId, req.user!.id, dto);
    res.json({ success: true, data });
  },

  async start(req: AuthenticatedRequest, res: Response) {
    const data = await svc.start(req.params.id, req.user!.clubId);
    res.json({ success: true, data });
  },

  async addParticipant(req: AuthenticatedRequest, res: Response) {
    const dto = addParticipantSchema.parse(req.body);
    const data = await svc.addParticipant(req.params.id, req.user!.clubId, req.user!.id, dto);
    res.status(201).json({ success: true, data });
  },

  async removeParticipant(req: AuthenticatedRequest, res: Response) {
    await svc.removeParticipant(req.params.id, req.params.pid, req.user!.clubId);
    res.json({ success: true, data: { message: 'Removed' } });
  },

  async generateFixture(req: AuthenticatedRequest, res: Response) {
    const dto = generateFixtureSchema.parse(req.body);
    const data = await svc.generateFixture(req.params.id, req.user!.clubId, req.user!.id, dto);
    res.status(201).json({ success: true, data });
  },

  async getRounds(req: AuthenticatedRequest, res: Response) {
    const data = await svc.getRounds(req.params.id);
    res.json({ success: true, data });
  },

  async loadResult(req: AuthenticatedRequest, res: Response) {
    const dto = loadResultSchema.parse(req.body);
    const data = await svc.loadResult(req.params.id, req.params.mid, req.user!.clubId, dto);
    res.json({ success: true, data });
  },

  async loadWalkover(req: AuthenticatedRequest, res: Response) {
    const dto = walkoverSchema.parse(req.body);
    const data = await svc.loadWalkover(req.params.id, req.params.mid, req.user!.clubId, dto);
    res.json({ success: true, data });
  },

  async loadStats(req: AuthenticatedRequest, res: Response) {
    const dto = loadStatsSchema.parse(req.body);
    const data = await svc.loadStats(req.params.id, req.params.mid, dto);
    res.json({ success: true, data });
  },

  async getStandings(req: AuthenticatedRequest, res: Response) {
    const data = await svc.getStandings(req.params.id);
    res.json({ success: true, data });
  },

  async generateBracket(req: AuthenticatedRequest, res: Response) {
    const data = await svc.generateBracket(req.params.id, req.user!.clubId);
    res.status(201).json({ success: true, data });
  },

  async getBracket(req: AuthenticatedRequest, res: Response) {
    const data = await svc.getBracket(req.params.id, req.user!.clubId);
    res.json({ success: true, data });
  },

  async getLeaders(req: AuthenticatedRequest, res: Response) {
    const data = await svc.getLeaders(req.params.id, req.user!.clubId);
    res.json({ success: true, data });
  },

  async patchMatchSchedule(req: AuthenticatedRequest, res: Response) {
    const dto = patchMatchScheduleSchema.parse(req.body);
    const data = await svc.patchMatchSchedule(req.params.id, req.params.mid, req.user!.clubId, dto);
    res.json({ success: true, data });
  },
};
