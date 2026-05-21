import { prisma } from '@/config/database';
import { CreateDocumentDto } from './documents.schema';

export const documentsRepository = {
  findAll: (clubId: string, filters?: { playerId?: string; type?: string }) =>
    prisma.document.findMany({
      where: { clubId, ...(filters?.playerId && { playerId: filters.playerId }), ...(filters?.type && { type: filters.type }) },
      include: { player: { include: { user: { select: { firstName: true, lastName: true } } } } },
      orderBy: { uploadedAt: 'desc' },
    }),

  create: (clubId: string, dto: CreateDocumentDto) =>
    prisma.document.create({
      data: { clubId, ...dto, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined },
      include: { player: { include: { user: { select: { firstName: true, lastName: true } } } } },
    }),

  delete: (id: string, clubId: string) =>
    prisma.document.deleteMany({ where: { id, clubId } }),
};
