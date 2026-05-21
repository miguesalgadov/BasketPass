import bcrypt from 'bcrypt';
import { prisma } from '@/config/database';
import { playersRepository } from './players.repository';
import { CreatePlayerDto, UpdatePlayerDto, PlayerQuery, ImportPlayersDto } from './players.schema';

export const playersService = {
  async getAll(clubId: string, query: PlayerQuery) {
    const { players, total } = await playersRepository.findAll(clubId, query);
    return {
      players,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  },

  async getById(id: string, clubId: string) {
    const player = await playersRepository.findById(id, clubId);
    if (!player) {
      const err = new Error('Player not found');
      (err as any).statusCode = 404;
      throw err;
    }
    return player;
  },

  async create(clubId: string, dto: CreatePlayerDto) {
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const player = await playersRepository.create(clubId, dto, passwordHash);
    return { player, tempPassword };
  },

  async update(id: string, clubId: string, dto: UpdatePlayerDto) {
    await playersService.getById(id, clubId);
    return playersRepository.update(id, dto);
  },

  getByUserId: (userId: string) => playersRepository.findByUserId(userId),

  async deactivate(id: string, clubId: string) {
    await playersService.getById(id, clubId);
    return playersRepository.deactivate(id);
  },

  async import(clubId: string, dto: ImportPlayersDto) {
    const sharedHash = await bcrypt.hash('Temporal1234!', 10);

    // Build category/name → teamId map for auto-resolution
    const teams = await prisma.team.findMany({
      where: { clubId, isActive: true },
      select: { id: true, name: true, category: true },
    });
    const teamMap = new Map<string, string>();
    teams.forEach((t) => {
      teamMap.set(t.category.toLowerCase(), t.id);
      teamMap.set(t.name.toLowerCase(), t.id);
    });

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const row of dto.players) {
      try {
        const resolvedTeamId = (dto.teamId
          ?? (row.categoria ? teamMap.get(row.categoria.toLowerCase()) : undefined)
          ?? null) as string | null;

        const playerData = {
          teamId:       resolvedTeamId,
          jerseyNumber: row.jerseyNumber ?? null,
          position:     row.position ?? null,
          birthDate:    row.birthDate ? (isNaN(new Date(row.birthDate).getTime()) ? null : new Date(row.birthDate)) : null,
          clothingSize: row.clothingSize ?? null,
        };

        // Normalizar email: trim + lowercase
        const cleanEmail = row.email?.trim().toLowerCase() ?? null;

        // Buscar existente: RUT primero, luego email
        let existingUser: { id: string; player: { id: string } | null } | null = null;
        if (row.rut) {
          existingUser = await prisma.user.findFirst({
            where: { clubId, rut: row.rut },
            select: { id: true, player: { select: { id: true } } },
          });
        }
        if (!existingUser && cleanEmail) {
          existingUser = await prisma.user.findFirst({
            where: { clubId, email: cleanEmail },
            select: { id: true, player: { select: { id: true } } },
          });
        }

        if (existingUser) {
          // UPDATE — no duplicar
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              firstName: row.firstName,
              lastName:  row.lastName,
              rut:       row.rut ?? undefined,
              phone:     row.emergencyPhone ?? undefined,
              ...(cleanEmail ? { email: cleanEmail } : {}),
            },
          });
          if (existingUser.player) {
            await prisma.player.update({ where: { id: existingUser.player.id }, data: playerData });
          } else {
            await prisma.player.create({ data: { userId: existingUser.id, ...playerData } });
          }
          updated++;
        } else {
          // CREATE — generar email único si no viene uno
          const emailBase = row.rut
            ? row.rut.replace(/[^0-9kK]/g, '').toLowerCase()
            : `${row.firstName.split(' ')[0].toLowerCase()}.${row.lastName.split(' ')[0].toLowerCase()}`;

          let email = cleanEmail ?? `${emailBase}@jugador.internal`;

          // Siempre verificar unicidad dentro del club (real o generado)
          let suffix = 1;
          let check = await prisma.user.findUnique({ where: { clubId_email: { clubId, email } } });
          while (check) {
            email = `${emailBase}${suffix++}@jugador.internal`;
            check = await prisma.user.findUnique({ where: { clubId_email: { clubId, email } } });
          }

          await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
              data: {
                clubId,
                email,
                passwordHash: sharedHash,
                role:      'PLAYER',
                firstName: row.firstName,
                lastName:  row.lastName,
                phone:     row.emergencyPhone ?? null,
                rut:       row.rut ?? null,
              },
            });
            await tx.player.create({ data: { userId: user.id, ...playerData } });
          });
          created++;
        }
      } catch (e: any) {
        const msg = e?.message ?? String(e);
        errors.push(`${row.firstName} ${row.lastName}: ${msg}`);
        console.error(`[import] ${row.firstName} ${row.lastName}:`, msg);
      }
    }

    return { created, updated, errors };
  },
};
