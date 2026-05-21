/**
 * Fusiona jugadores duplicados dentro del mismo club.
 * Criterios de duplicado: mismo RUT (alta confianza) o mismo nombre+apellido+fechaNacimiento.
 * Ganador = el registro con más campos completos; los campos nulos del ganador se rellenan con los del perdedor.
 * Todos los registros relacionados se reasignan al ganador antes de eliminar al perdedor.
 *
 * Uso: npx ts-node -r tsconfig-paths/register prisma/dedup-players.ts [--dry-run]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

// ── Utilidades ────────────────────────────────────────────────────────────────

function countFields(obj: Record<string, unknown>): number {
  return Object.values(obj).filter((v) => v !== null && v !== undefined && v !== '').length;
}

function normalize(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function coalesce<T>(a: T | null | undefined, b: T | null | undefined): T | null {
  return (a !== null && a !== undefined) ? a : (b ?? null);
}

// Prioridad de status de cuota para resolver conflictos
const FEE_STATUS_PRIORITY: Record<string, number> = {
  PAID: 4, OVERDUE: 3, PENDING: 2, EXEMPT: 1, INJURED: 1, NOT_ENROLLED: 0, CANCELLED: 0,
};

// ── Carga de datos ────────────────────────────────────────────────────────────

async function loadPlayers(ids: string[]) {
  return prisma.user.findMany({
    where: { id: { in: ids } },
    include: { player: true },
  });
}

// ── Scoring ───────────────────────────────────────────────────────────────────

function score(user: Awaited<ReturnType<typeof loadPlayers>>[number]): number {
  const userFields = {
    firstName: user.firstName, lastName: user.lastName, rut: user.rut,
    phone: user.phone, avatarUrl: user.avatarUrl, lastLoginAt: user.lastLoginAt,
  };
  const playerFields = user.player ? {
    teamId: user.player.teamId, jerseyNumber: user.player.jerseyNumber,
    position: user.player.position, birthDate: user.player.birthDate,
    height: user.player.height, weight: user.player.weight,
    clothingSize: user.player.clothingSize, documentUrl: user.player.documentUrl,
  } : {};
  return countFields(userFields as Record<string, unknown>)
       + countFields(playerFields as Record<string, unknown>);
}

// ── Fusión de un par de duplicados ────────────────────────────────────────────

async function mergePair(
  winner: Awaited<ReturnType<typeof loadPlayers>>[number],
  loser:  Awaited<ReturnType<typeof loadPlayers>>[number],
) {
  const winnerId   = winner.id;
  const loserId    = loser.id;
  const winnerPid  = winner.player?.id;
  const loserPid   = loser.player?.id;

  console.log(`  Ganador : ${winner.firstName} ${winner.lastName} (user=${winnerId}, player=${winnerPid ?? 'SIN PLAYER'})`);
  console.log(`  Perdedor: ${loser.firstName}  ${loser.lastName}  (user=${loserId}, player=${loserPid ?? 'SIN PLAYER'})`);

  if (DRY_RUN) {
    console.log('  [dry-run] Saltando escrituras.\n');
    return;
  }

  await prisma.$transaction(async (tx) => {
    // 1. Completar campos nulos del usuario ganador con los del perdedor
    await tx.user.update({
      where: { id: winnerId },
      data: {
        rut:       coalesce(winner.rut,       loser.rut)       ?? undefined,
        phone:     coalesce(winner.phone,     loser.phone)     ?? undefined,
        avatarUrl: coalesce(winner.avatarUrl, loser.avatarUrl) ?? undefined,
      },
    });

    // 2. Completar campos nulos del player ganador con los del perdedor
    if (winnerPid && loserPid && winner.player && loser.player) {
      const wp = winner.player;
      const lp = loser.player;
      await tx.player.update({
        where: { id: winnerPid },
        data: {
          teamId:       coalesce(wp.teamId,       lp.teamId)       ?? undefined,
          jerseyNumber: coalesce(wp.jerseyNumber, lp.jerseyNumber) ?? undefined,
          position:     coalesce(wp.position,     lp.position)     ?? undefined,
          birthDate:    coalesce(wp.birthDate,    lp.birthDate)    ?? undefined,
          height:       coalesce(wp.height,       lp.height)       ?? undefined,
          weight:       coalesce(wp.weight,       lp.weight)       ?? undefined,
          clothingSize: coalesce(wp.clothingSize, lp.clothingSize) ?? undefined,
          documentUrl:  coalesce(wp.documentUrl,  lp.documentUrl)  ?? undefined,
        },
      });
    }

    // 3. Si el perdedor tiene player y el ganador no, reasignar el player al ganador
    if (!winnerPid && loserPid) {
      await tx.player.update({ where: { id: loserPid }, data: { userId: winnerId } });
      console.log(`  Reasignado player ${loserPid} al ganador.`);
      // El loser ya no tiene player; salir temprano
      await tx.user.delete({ where: { id: loserId } });
      return;
    }

    // 4. Si ambos tienen player, reasignar todos los registros del player perdedor
    if (winnerPid && loserPid) {
      // Attendances
      await tx.attendance.updateMany({ where: { playerId: loserPid }, data: { playerId: winnerPid } });

      // PlayerStats (unique: playerId+matchId → ignorar conflictos eliminando el del perdedor)
      const winnerStatMatchIds = (await tx.playerStat.findMany({
        where: { playerId: winnerPid }, select: { matchId: true },
      })).map((s) => s.matchId);
      await tx.playerStat.deleteMany({ where: { playerId: loserPid, matchId: { in: winnerStatMatchIds } } });
      await tx.playerStat.updateMany({ where: { playerId: loserPid }, data: { playerId: winnerPid } });

      // Payments
      await tx.payment.updateMany({ where: { playerId: loserPid }, data: { playerId: winnerPid } });

      // Documents
      await tx.document.updateMany({ where: { playerId: loserPid }, data: { playerId: winnerPid } });

      // Injuries
      await tx.injury.updateMany({ where: { playerId: loserPid }, data: { playerId: winnerPid } });

      // PlayerParents
      const winnerParentIds = (await tx.playerParent.findMany({
        where: { playerId: winnerPid }, select: { parentId: true },
      })).map((p) => p.parentId);
      await tx.playerParent.deleteMany({ where: { playerId: loserPid, parentId: { in: winnerParentIds } } });
      await tx.playerParent.updateMany({ where: { playerId: loserPid }, data: { playerId: winnerPid } });

      // Fees (unique: playerId+feeTypeId+year+month → resolver conflictos)
      const winnerFees = await tx.fee.findMany({
        where: { playerId: winnerPid },
        select: { id: true, feeTypeId: true, year: true, month: true, status: true },
      });
      const winnerFeeKeys = new Map(winnerFees.map((f) => [`${f.feeTypeId}-${f.year}-${f.month}`, f]));

      const loserFees = await tx.fee.findMany({
        where: { playerId: loserPid },
        select: { id: true, feeTypeId: true, year: true, month: true, status: true },
      });

      for (const lf of loserFees) {
        const key = `${lf.feeTypeId}-${lf.year}-${lf.month}`;
        const wf  = winnerFeeKeys.get(key);
        if (wf) {
          const loserPriority  = FEE_STATUS_PRIORITY[lf.status] ?? 0;
          const winnerPriority = FEE_STATUS_PRIORITY[wf.status] ?? 0;
          if (loserPriority > winnerPriority) {
            // El perdedor tiene mejor status: actualizar el ganador y eliminar el perdedor
            await tx.fee.update({ where: { id: wf.id }, data: { status: lf.status, paidAt: (lf as any).paidAt, paidAmount: (lf as any).paidAmount, paymentMethod: (lf as any).paymentMethod } });
          }
          // En cualquier caso eliminar reminders + cuota del perdedor
          await tx.feeReminder.deleteMany({ where: { feeId: lf.id } });
          await tx.fee.delete({ where: { id: lf.id } });
        } else {
          await tx.fee.update({ where: { id: lf.id }, data: { playerId: winnerPid } });
        }
      }

      // ChampPlayerStats (unique: matchId+playerId)
      const winnerChampMatchIds = (await tx.champPlayerStat.findMany({
        where: { playerId: winnerPid }, select: { matchId: true },
      })).map((s) => s.matchId);
      await tx.champPlayerStat.deleteMany({ where: { playerId: loserPid, matchId: { in: winnerChampMatchIds } } });
      await tx.champPlayerStat.updateMany({ where: { playerId: loserPid }, data: { playerId: winnerPid } });

      // MatchLineup y MatchPlayerStat (playerId nullable)
      await tx.matchLineup.updateMany({ where: { playerId: loserPid }, data: { playerId: winnerPid } });
      await tx.matchPlayerStat.updateMany({ where: { playerId: loserPid }, data: { playerId: winnerPid } });

      // MatchNominationPlayers (unique: nominationId+playerId)
      const winnerNomIds = (await tx.matchNominationPlayer.findMany({
        where: { playerId: winnerPid }, select: { nominationId: true },
      })).map((n) => n.nominationId);
      await tx.matchNominationPlayer.deleteMany({ where: { playerId: loserPid, nominationId: { in: winnerNomIds } } });
      await tx.matchNominationPlayer.updateMany({ where: { playerId: loserPid }, data: { playerId: winnerPid } });

      // Eliminar el player del perdedor
      await tx.player.delete({ where: { id: loserPid } });
    }

    // 5. Eliminar el user del perdedor (cascade elimina refreshTokens, notifications, etc.)
    await tx.user.delete({ where: { id: loserId } });
  });

  console.log('  OK — fusionados.\n');
}

// ── Detección de duplicados ───────────────────────────────────────────────────

async function findDuplicateGroups(): Promise<string[][]> {
  const users = await prisma.user.findMany({
    where: { role: 'PLAYER', isActive: true },
    select: {
      id: true, clubId: true, firstName: true, lastName: true, rut: true,
      player: { select: { birthDate: true } },
    },
  });

  const byRut   = new Map<string, string[]>();
  const byName  = new Map<string, string[]>();

  for (const u of users) {
    // Agrupar por clubId + rut
    if (u.rut) {
      const k = `${u.clubId}::rut::${u.rut}`;
      if (!byRut.has(k)) byRut.set(k, []);
      byRut.get(k)!.push(u.id);
    }

    // Agrupar por clubId + nombre normalizado + fecha de nacimiento
    const bd = u.player?.birthDate ? new Date(u.player.birthDate).toISOString().slice(0, 10) : 'nofecha';
    const nameKey = `${u.clubId}::name::${normalize(u.firstName)}::${normalize(u.lastName)}::${bd}`;
    if (!byName.has(nameKey)) byName.set(nameKey, []);
    byName.get(nameKey)!.push(u.id);
  }

  const groups: string[][] = [];
  const seen = new Set<string>();

  const addGroup = (ids: string[]) => {
    if (ids.length < 2) return;
    // Evitar agregar el mismo par dos veces (puede aparecer por RUT y por nombre)
    const key = [...ids].sort().join('|');
    if (seen.has(key)) return;
    seen.add(key);
    groups.push(ids);
  };

  for (const ids of byRut.values())  addGroup(ids);
  for (const ids of byName.values()) addGroup(ids);

  return groups;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== Deduplicación de jugadores ${DRY_RUN ? '[DRY-RUN]' : ''} ===\n`);

  const groups = await findDuplicateGroups();

  if (groups.length === 0) {
    console.log('No se encontraron jugadores duplicados. Base de datos limpia.');
    return;
  }

  console.log(`Encontrados ${groups.length} grupo(s) de duplicados.\n`);
  let merged = 0;

  for (const [i, group] of groups.entries()) {
    console.log(`Grupo ${i + 1}/${groups.length} — ${group.length} registros:`);
    const users = await loadPlayers(group);

    // Ordenar por score desc; empate → el más antiguo (createdAt asc)
    users.sort((a, b) => {
      const diff = score(b) - score(a);
      return diff !== 0 ? diff : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const [winner, ...losers] = users;
    for (const loser of losers) {
      await mergePair(winner, loser);
      merged++;
    }
  }

  console.log(`\nFusión completada: ${merged} registro(s) eliminado(s).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
