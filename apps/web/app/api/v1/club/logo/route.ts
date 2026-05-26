import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden, ok, err } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  if (auth.role !== 'CLUB_ADMIN' && auth.role !== 'SUPER_ADMIN') return forbidden();

  try {
    const formData = await req.formData();
    const file = formData.get('logo') as File | null;
    if (!file) return err('No se recibió ningún archivo', 'NO_FILE', 400);
    if (!file.type.startsWith('image/')) return err('El archivo debe ser una imagen', 'INVALID_TYPE', 400);
    if (file.size > 2 * 1024 * 1024) return err('La imagen supera los 2 MB', 'TOO_LARGE', 400);

    const buffer  = await file.arrayBuffer();
    const base64  = Buffer.from(buffer).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    await prisma.club.update({ where: { id: auth.clubId }, data: { logo: dataUrl } });

    return ok({ logo: dataUrl });
  } catch (e: any) {
    return err(e.message, 'UPLOAD_ERROR', 500);
  }
}

export async function DELETE(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  if (auth.role !== 'CLUB_ADMIN' && auth.role !== 'SUPER_ADMIN') return forbidden();

  await prisma.club.update({ where: { id: auth.clubId }, data: { logo: null } });
  return ok({ logo: null });
}
