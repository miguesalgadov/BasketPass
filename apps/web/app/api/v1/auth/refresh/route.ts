import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { ok, err } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('refreshToken')?.value || (await req.json().catch(() => ({}))).refreshToken;
  if (!refreshToken) return err('No refresh token', 'NO_REFRESH_TOKEN', 401);

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { sub: string };
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });
    if (!stored || stored.expiresAt < new Date()) return err('Refresh token expired', 'TOKEN_EXPIRED', 401);

    await prisma.refreshToken.delete({ where: { token: refreshToken } });

    const { user } = stored;
    const tokenPayload = { sub: user.id, email: user.email, role: user.role, clubId: user.clubId };
    const newAccessToken = jwt.sign(tokenPayload, process.env.JWT_ACCESS_SECRET!, { expiresIn: '15m' });
    const newRefreshToken = jwt.sign({ sub: user.id }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' });

    await prisma.refreshToken.create({
      data: { userId: user.id, token: newRefreshToken, expiresAt: new Date(Date.now() + 7 * 86400000) },
    });

    const response = ok({ accessToken: newAccessToken });
    response.cookies.set('refreshToken', newRefreshToken, {
      httpOnly: true, secure: true, sameSite: 'strict', maxAge: 7 * 86400,
    });
    return response;
  } catch {
    return err('Invalid refresh token', 'INVALID_TOKEN', 401);
  }
}
