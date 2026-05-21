import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok, err } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const teamId = new URL(req.url).searchParams.get('teamId');
  const messages = await prisma.message.findMany({
    where: { ...(teamId && { teamId }) },
    include: { sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true } } },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });
  return ok(messages);
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  try {
    const { teamId, content } = await req.json();
    const message = await prisma.message.create({
      data: { senderId: auth.id, teamId: teamId || null, content },
      include: { sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    });
    return ok(message, 201);
  } catch (e: any) {
    return err(e.message, 'CHAT_ERROR', 400);
  }
}
