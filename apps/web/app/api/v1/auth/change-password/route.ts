import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok, err } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  try {
    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) return err('Faltan campos requeridos', 'VALIDATION_ERROR');
    if (newPassword.length < 8) return err('La contraseña debe tener al menos 8 caracteres', 'VALIDATION_ERROR');

    const user = await prisma.user.findUnique({ where: { id: auth.id } });
    if (!user) return err('Usuario no encontrado', 'NOT_FOUND', 404);

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return err('Contraseña actual incorrecta', 'INVALID_CREDENTIALS', 401);

    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: auth.id }, data: { passwordHash: hash } });

    return ok({ message: 'Contraseña actualizada correctamente' });
  } catch (e: any) {
    return err(e.message, 'UPDATE_ERROR', 500);
  }
}
