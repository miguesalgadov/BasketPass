import { attendanceRepository } from './attendance.repository';
import { BulkAttendanceDto } from './attendance.schema';

export const attendanceService = {
  record: (dto: BulkAttendanceDto) => attendanceRepository.bulkUpsert(dto),
  getBySession: (sessionId: string, type: 'match' | 'training') =>
    attendanceRepository.findBySession(sessionId, type),
  getPlayerStats: (playerId: string) => attendanceRepository.getPlayerStats(playerId),
  getClubStats: (clubId: string) => attendanceRepository.getClubStats(clubId),
};
