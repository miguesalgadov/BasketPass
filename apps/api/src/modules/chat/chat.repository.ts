import { prisma } from '@/config/database';
import { SendMessageDto } from './chat.schema';

export const chatRepository = {
  getMessages: (teamId?: string, limit = 50) =>
    prisma.message.findMany({
      where: teamId ? { teamId } : { teamId: null },
      include: { sender: { select: { id: true, firstName: true, lastName: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),

  send: (senderId: string, dto: SendMessageDto) =>
    prisma.message.create({
      data: { senderId, content: dto.content, teamId: dto.teamId ?? null },
      include: { sender: { select: { id: true, firstName: true, lastName: true, role: true } } },
    }),
};
