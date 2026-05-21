import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { ok, err } from '@/lib/auth-server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return err('Email and password are required', 'VALIDATION_ERROR');

    const user = await prisma.user.findFirst({
      where: { email, isActive: true },
      include: { club: true },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return err('Invalid email or password', 'INVALID_CREDENTIALS', 401);
    }

    const payload = { sub: user.id, email: user.email, role: user.role, clubId: user.clubId };
    const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ sub: user.id }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' });

    await prisma.refreshToken.create({
      data: { userId: user.id, token: refreshToken, expiresAt: new Date(Date.now() + 7 * 86400000) },
    });
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const { passwordHash: _, ...safeUser } = user;
    const response = ok({ user: safeUser, accessToken });
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true, secure: true, sameSite: 'strict', maxAge: 7 * 86400,
    });
    return response;
  } catch (e: any) {
    return err(e.message || 'Login failed', 'LOGIN_ERROR', 500);
  }
}
