import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  clubId: string;
};

export function getAuthUser(req: NextRequest): AuthUser | null {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(auth.slice(7), process.env.JWT_ACCESS_SECRET!) as any;
    return { id: payload.sub, email: payload.email, role: payload.role, clubId: payload.clubId };
  } catch {
    return null;
  }
}

export function unauthorized() {
  return NextResponse.json(
    { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
    { status: 401 }
  );
}

export function forbidden() {
  return NextResponse.json(
    { success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
    { status: 403 }
  );
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function err(message: string, code = 'ERROR', status = 400) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}
