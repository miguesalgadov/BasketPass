import { teamsRepository } from './teams.repository';
import { CreateTeamDto, UpdateTeamDto } from './teams.schema';

export const teamsService = {
  getAll: (clubId: string) => teamsRepository.findAll(clubId),

  async getById(id: string, clubId: string) {
    const team = await teamsRepository.findById(id, clubId);
    if (!team) {
      const err = new Error('Team not found');
      (err as any).statusCode = 404;
      throw err;
    }
    return team;
  },

  create: (clubId: string, dto: CreateTeamDto) => teamsRepository.create(clubId, dto),

  async update(id: string, clubId: string, dto: UpdateTeamDto) {
    await teamsService.getById(id, clubId);
    return teamsRepository.update(id, dto);
  },

  async delete(id: string, clubId: string) {
    await teamsService.getById(id, clubId);
    return teamsRepository.delete(id);
  },

  getCoaches: (clubId: string) => teamsRepository.findCoaches(clubId),
};
