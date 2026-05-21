import { z } from 'zod';

const AttendanceStatus = z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']);

export const bulkAttendanceSchema = z.object({
  sessionId: z.string(),
  sessionType: z.enum(['match', 'training']),
  attendances: z.array(z.object({
    playerId: z.string(),
    status: AttendanceStatus,
    notes: z.string().optional(),
  })),
});

export type BulkAttendanceDto = z.infer<typeof bulkAttendanceSchema>;
