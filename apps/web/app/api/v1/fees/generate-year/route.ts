import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden, ok, err } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  if (auth.role !== 'CLUB_ADMIN' && auth.role !== 'SUPER_ADMIN') return forbidden();

  try {
    const { year, feeTypeId } = await req.json();

    const feeTypes = feeTypeId
      ? await prisma.feeType.findMany({ where: { id: feeTypeId, clubId: auth.clubId, isActive: true } })
      : await prisma.feeType.findMany({ where: { clubId: auth.clubId, isActive: true } });

    if (feeTypes.length === 0) return err('No hay tipos de cuota configurados', 'NOT_FOUND', 404);

    const players = await prisma.player.findMany({ where: { user: { clubId: auth.clubId }, isActive: true } });
    let created = 0;

    for (const feeType of feeTypes) {
      for (let month = 1; month <= 12; month++) {
        const dueDate = new Date(year, month - 1, feeType.dueDayOfMonth);
        for (const player of players) {
          try {
            await prisma.fee.upsert({
              where: { playerId_feeTypeId_year_month: { playerId: player.id, feeTypeId: feeType.id, year, month } },
              update: {},
              create: { clubId: auth.clubId, playerId: player.id, feeTypeId: feeType.id, year, month, amount: feeType.amount, dueDate, status: 'PENDING' },
            });
            created++;
          } catch { /* skip duplicate */ }
        }
      }
    }
    return ok({ created, message: `Generated ${created} fees for year ${year}` });
  } catch (e: any) {
    return err(e.message, 'GENERATE_ERROR', 400);
  }
}
