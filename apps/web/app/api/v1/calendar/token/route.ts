import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const token = jwt.sign({ sub: auth.id, clubId: auth.clubId }, process.env.JWT_ACCESS_SECRET!, { expiresIn: '30d' });
  return ok({ token, feedUrl: `/api/v1/calendar/feed.ics?token=${token}` });
}
