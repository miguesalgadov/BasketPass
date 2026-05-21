import { NextRequest } from 'next/server';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function POST(req: NextRequest, { params }: { params: { matchId: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  return ok({ message: 'WhatsApp not configured in this environment' });
}
