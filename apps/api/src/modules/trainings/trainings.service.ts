import { randomUUID } from 'crypto';
import { trainingsRepository } from './trainings.repository';
import { CreateTrainingDto, UpdateTrainingDto } from './trainings.schema';

export const trainingsService = {
  getAll: (clubId: string, teamId?: string) => trainingsRepository.findAll(clubId, teamId),

  async getById(id: string, clubId: string) {
    const training = await trainingsRepository.findById(id, clubId);
    if (!training) {
      const err = new Error('Training not found');
      (err as any).statusCode = 404;
      throw err;
    }
    return training;
  },

  async create(dto: CreateTrainingDto) {
    const base = {
      teamId:    dto.teamId,
      duration:  dto.duration,
      location:  dto.location,
      plan:      dto.plan,
      coachNotes: dto.coachNotes,
    };

    // ── Entrenamiento único ───────────────────────────────────────────────
    if (!dto.recurrent || !dto.daysOfWeek?.length || !dto.recurrenceEndDate) {
      const [created] = await trainingsRepository.createMany([
        { ...base, date: new Date(dto.date) },
      ]);
      return { count: 1, trainings: [created] };
    }

    // ── Entrenamientos recurrentes ────────────────────────────────────────
    const groupId   = randomUUID();
    const startDate = new Date(dto.date);
    const endDate   = new Date(dto.recurrenceEndDate);
    const time      = { h: startDate.getHours(), m: startDate.getMinutes() };

    const dates: Date[] = [];
    const cursor = new Date(startDate);
    cursor.setHours(time.h, time.m, 0, 0);

    while (cursor <= endDate) {
      if (dto.daysOfWeek.includes(cursor.getDay())) {
        dates.push(new Date(cursor));
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    if (dates.length === 0) {
      const err = new Error('No se generaron fechas con los días seleccionados en ese rango');
      (err as any).statusCode = 400;
      throw err;
    }

    const records = dates.map((date) => ({ ...base, date, recurrenceGroupId: groupId }));
    const trainings = await trainingsRepository.createMany(records);
    return { count: trainings.length, trainings };
  },

  async update(id: string, clubId: string, dto: UpdateTrainingDto) {
    await trainingsService.getById(id, clubId);
    return trainingsRepository.update(id, dto);
  },

  async delete(id: string, clubId: string) {
    await trainingsService.getById(id, clubId);
    return trainingsRepository.delete(id);
  },

  async deleteSeries(groupId: string, clubId: string, fromDate?: string) {
    return trainingsRepository.deleteSeries(
      groupId,
      clubId,
      fromDate ? new Date(fromDate) : undefined,
    );
  },
};
