import { prisma } from '@/config/database';
import { CreateFeeTypeDto, UpdateFeeTypeDto } from './fee-types.schema';

export const feeTypesRepository = {
  findAll: (clubId: string) =>
    prisma.feeType.findMany({ where: { clubId, isActive: true }, orderBy: { createdAt: 'asc' } }),

  findById: (id: string, clubId: string) =>
    prisma.feeType.findFirst({ where: { id, clubId } }),

  findRecurring: (clubId: string) =>
    prisma.feeType.findMany({ where: { clubId, isRecurring: true, isActive: true } }),

  create: (clubId: string, dto: CreateFeeTypeDto) =>
    prisma.feeType.create({ data: { ...dto, clubId } }),

  update: (id: string, dto: UpdateFeeTypeDto) =>
    prisma.feeType.update({ where: { id }, data: dto }),

  softDelete: (id: string) =>
    prisma.feeType.update({ where: { id }, data: { isActive: false } }),
};
