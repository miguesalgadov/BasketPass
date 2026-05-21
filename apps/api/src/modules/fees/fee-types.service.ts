import { prisma } from '@/config/database';
import { feeTypesRepository } from './fee-types.repository';
import { CreateFeeTypeDto, UpdateFeeTypeDto } from './fee-types.schema';

export const feeTypesService = {
  getAll: (clubId: string) => feeTypesRepository.findAll(clubId),

  async getById(id: string, clubId: string) {
    const ft = await feeTypesRepository.findById(id, clubId);
    if (!ft) { const e = new Error('FeeType not found'); (e as any).statusCode = 404; throw e; }
    return ft;
  },

  create: (clubId: string, dto: CreateFeeTypeDto) => feeTypesRepository.create(clubId, dto),

  async update(id: string, clubId: string, dto: UpdateFeeTypeDto) {
    await feeTypesService.getById(id, clubId);
    return feeTypesRepository.update(id, dto);
  },

  async delete(id: string, clubId: string) {
    await feeTypesService.getById(id, clubId);
    await prisma.$transaction(async (tx) => {
      const feeIds = (await tx.fee.findMany({ where: { feeTypeId: id }, select: { id: true } })).map((f) => f.id);
      if (feeIds.length > 0) {
        await tx.feeReminder.deleteMany({ where: { feeId: { in: feeIds } } });
        await tx.fee.deleteMany({ where: { id: { in: feeIds } } });
      }
      await tx.feeType.delete({ where: { id } });
    });
  },
};
