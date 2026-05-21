import { matchesRepository } from './matches.repository';
import { CreateMatchDto, UpdateMatchDto } from './matches.schema';

export const matchesService = {
  getAll: (clubId: string, teamId?: string) => matchesRepository.findAll(clubId, teamId),

  async getById(id: string, clubId: string) {
    const match = await matchesRepository.findById(id, clubId);
    if (!match) {
      const err = new Error('Match not found');
      (err as any).statusCode = 404;
      throw err;
    }
    return match;
  },

  create: (dto: CreateMatchDto) => matchesRepository.create(dto),
  update: (id: string, clubId: string, dto: UpdateMatchDto) => matchesRepository.update(id, dto),

  async delete(id: string, clubId: string) {
    await matchesService.getById(id, clubId);
    return matchesRepository.delete(id);
  },
};
