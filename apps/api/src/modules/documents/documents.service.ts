import { documentsRepository } from './documents.repository';
import { CreateDocumentDto } from './documents.schema';

export const documentsService = {
  getAll: (clubId: string, filters?: { playerId?: string; type?: string }) =>
    documentsRepository.findAll(clubId, filters),

  create: (clubId: string, dto: CreateDocumentDto) =>
    documentsRepository.create(clubId, dto),

  async delete(id: string, clubId: string) {
    const result = await documentsRepository.delete(id, clubId);
    if (result.count === 0) {
      const err = new Error('Document not found');
      (err as any).statusCode = 404;
      throw err;
    }
  },
};
