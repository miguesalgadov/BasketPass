import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok, err } from '@/lib/auth-server';

export async function DELETE(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  await prisma.user.update({ where: { id: auth.id }, data: { avatarUrl: null } });
  return ok({ avatarUrl: null });
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  try {
    const formData = await req.formData();
    const file = formData.get('avatar') as File | null;
    if (!file) return err('No se recibió ningún archivo', 'NO_FILE', 400);
    if (!file.type.startsWith('image/')) return err('El archivo debe ser una imagen', 'INVALID_TYPE', 400);
    if (file.size > 2 * 1024 * 1024) return err('La imagen supera los 2 MB', 'TOO_LARGE', 400);

    const buffer  = await file.arrayBuffer();
    const base64  = Buffer.from(buffer).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    await prisma.user.update({ where: { id: auth.id }, data: { avatarUrl: dataUrl } });

    return ok({ avatarUrl: dataUrl });
  } catch (e: any) {
    return err(e.message, 'UPLOAD_ERROR', 500);
  }
}
