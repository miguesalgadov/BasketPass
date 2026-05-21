import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok, err } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  try {
    const { year, month, feeTypeId } = await req.json();
    const feeType = await prisma.feeType.findFirst({ where: { id: feeTypeId, clubId: auth.clubId } });
    if (!feeType) return err('Fee type not found', 'NOT_FOUND', 404);

    const players = await prisma.player.findMany({ where: { user: { clubId: auth.clubId }, isActive: true } });
    const dueDate = new Date(year, month - 1, feeType.dueDayOfMonth);

    let created = 0;
    for (const player of players) {
      try {
        await prisma.fee.upsert({
          where: { playerId_feeTypeId_year_month: { playerId: player.id, feeTypeId, year, month } },
          update: {},
          create: { clubId: auth.clubId, playerId: player.id, feeTypeId, year, month, amount: feeType.amount, dueDate, status: 'PENDING' },
        });
        created++;
      } catch { /* skip */ }
    }
    return ok({ created, message: `Generated ${created} fees for ${month}/${year}` });
  } catch (e: any) {
    return err(e.message, 'GENERATE_ERROR', 400);
  }
}
