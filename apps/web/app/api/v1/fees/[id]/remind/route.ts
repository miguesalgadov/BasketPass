import { NextRequest } from 'next/server';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  return ok({ message: 'Reminder queued (email/push not configured in this environment)' });
}
