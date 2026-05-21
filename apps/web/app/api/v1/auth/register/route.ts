import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { ok, err } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  try {
    const { clubName, clubSlug, adminEmail, adminPassword, adminFirstName, adminLastName, adminPhone } = await req.json();

    const existing = await prisma.club.findUnique({ where: { slug: clubSlug } });
    if (existing) return err('Club slug is already taken', 'SLUG_TAKEN', 409);

    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const { club, user } = await prisma.$transaction(async (tx) => {
      const club = await tx.club.create({ data: { name: clubName, slug: clubSlug } });
      const user = await tx.user.create({
        data: { clubId: club.id, email: adminEmail, passwordHash, role: 'CLUB_ADMIN', firstName: adminFirstName, lastName: adminLastName, phone: adminPhone },
        include: { club: true },
      });
      return { club, user };
    });

    const payload = { sub: user.id, email: user.email, role: user.role, clubId: club.id };
    const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ sub: user.id }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' });

    await prisma.refreshToken.create({
      data: { userId: user.id, token: refreshToken, expiresAt: new Date(Date.now() + 7 * 86400000) },
    });

    const { passwordHash: _, ...safeUser } = user;
    const response = ok({ club, user: safeUser, accessToken }, 201);
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true, secure: true, sameSite: 'strict', maxAge: 7 * 86400,
    });
    return response;
  } catch (e: any) {
    return err(e.message || 'Registration failed', 'REGISTER_ERROR', 500);
  }
}
