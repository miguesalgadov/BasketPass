import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok, err } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  try {
    const { endpoint, keys } = await req.json();
    if (!endpoint || !keys?.p256dh || !keys?.auth) return err('Invalid subscription', 'INVALID_BODY', 400);

    await prisma.pushSubscription.upsert({
      where:  { endpoint },
      update: { userId: auth.id, p256dh: keys.p256dh, auth: keys.auth },
      create: { userId: auth.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    });

    return ok({ ok: true });
  } catch (e: any) {
    return err(e.message, 'SUBSCRIBE_ERROR', 500);
  }
}

export async function DELETE(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  try {
    const { endpoint } = await req.json();
    if (endpoint) {
      await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: auth.id } });
    } else {
      await prisma.pushSubscription.deleteMany({ where: { userId: auth.id } });
    }
    return ok({ ok: true });
  } catch (e: any) {
    return err(e.message, 'UNSUBSCRIBE_ERROR', 500);
  }
}
