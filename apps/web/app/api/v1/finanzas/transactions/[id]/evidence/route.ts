import { NextRequest } from 'next/server';
import { ok } from '@/lib/auth-server';
import { getAuthUser, unauthorized } from '@/lib/auth-server';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  return ok({ message: 'File upload not configured in this environment' });
}
