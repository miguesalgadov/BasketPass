import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok, err } from '@/lib/auth-server';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  try {
    const championship = await prisma.championship.findUnique({
      where: { id: params.id },
      include: { participants: true },
    });
    if (!championship) return err('Championship not found', 'NOT_FOUND', 404);

    await prisma.championship.update({
      where: { id: params.id },
      data: { fixtureGeneratedAt: new Date(), status: 'ACTIVE' },
    });
    return ok({ message: 'Fixture generated', championshipId: params.id });
  } catch (e: any) {
    return err(e.message, 'FIXTURE_ERROR', 400);
  }
}
