import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPush } from '@/lib/push';

// Vercel cron calls this every hour (see vercel.json).
// Window: events starting 90–150 min from now → each event notified exactly once per hourly run.

const CRON_SECRET = process.env.CRON_SECRET;

function json(body: object, status = 200) {
  return NextResponse.json(body, { status });
}

export async function GET(req: NextRequest) {
  // Secure the endpoint: Vercel passes the secret as a header or query param
  const auth = req.headers.get('authorization') ?? req.nextUrl.searchParams.get('secret');
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}` && auth !== CRON_SECRET) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const now   = new Date();
  const winLo = new Date(now.getTime() + 90  * 60 * 1000); // 90 min from now
  const winHi = new Date(now.getTime() + 150 * 60 * 1000); // 150 min from now

  let sent = 0;

  // ── 1. Match reminders ────────────────────────────────────────────────────
  const matches = await prisma.match.findMany({
    where:   { date: { gte: winLo, lte: winHi }, status: 'SCHEDULED' },
    include: {
      team: {
        include: {
          players: { where: { isActive: true }, include: { user: { include: { pushSubscriptions: true } } } },
          coach:   { include: { pushSubscriptions: true } },
        },
      },
    },
  });

  for (const match of matches) {
    const timeStr = match.date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const payload = {
      title: '🏀 Partido en 2 horas',
      body:  `${match.team.name} vs. ${match.opponent} a las ${timeStr}`,
      url:   '/player',
    };
    const coachPayload = { ...payload, url: '/coach' };

    // Notify players
    for (const player of match.team.players) {
      for (const sub of player.user.pushSubscriptions) {
        const ok = await sendPush(sub, payload);
        if (ok) sent++;
        else await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
    }

    // Notify coach
    if (match.team.coach) {
      for (const sub of match.team.coach.pushSubscriptions) {
        const ok = await sendPush(sub, coachPayload);
        if (ok) sent++;
        else await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
    }
  }

  // ── 2. Training reminders ─────────────────────────────────────────────────
  const trainings = await prisma.training.findMany({
    where:   { date: { gte: winLo, lte: winHi } },
    include: {
      team: {
        include: {
          players: { where: { isActive: true }, include: { user: { include: { pushSubscriptions: true } } } },
          coach:   { include: { pushSubscriptions: true } },
        },
      },
    },
  });

  for (const training of trainings) {
    const timeStr = training.date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const payload = {
      title: '🏃 Entrenamiento en 2 horas',
      body:  `${training.team.name} — ${timeStr}${training.location ? ' · ' + training.location : ''}`,
      url:   '/player/calendar',
    };
    const coachPayload = { ...payload, url: '/coach/training' };

    for (const player of training.team.players) {
      for (const sub of player.user.pushSubscriptions) {
        const ok = await sendPush(sub, payload);
        if (ok) sent++;
        else await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
    }

    if (training.team.coach) {
      for (const sub of training.team.coach.pushSubscriptions) {
        const ok = await sendPush(sub, coachPayload);
        if (ok) sent++;
        else await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
    }
  }

  // ── 3. Fee overdue notifications ──────────────────────────────────────────
  // Find fees that just became overdue (dueDate passed in the last 60 min)
  // and haven't been notified via PUSH yet.
  const overdueWindow = new Date(now.getTime() - 60 * 60 * 1000);

  const overdueFees = await prisma.fee.findMany({
    where: {
      status:  'PENDING',
      dueDate: { gte: overdueWindow, lt: now },
      reminders: { none: { channel: 'PUSH', type: 'OVERDUE_1DAY' } },
    },
    include: {
      player: {
        include: {
          user: { include: { pushSubscriptions: true, club: true } },
          team: { include: { coach: { include: { pushSubscriptions: true } } } },
        },
      },
    },
  });

  for (const fee of overdueFees) {
    const playerName = `${fee.player.user.firstName} ${fee.player.user.lastName}`;
    const amount     = `$${fee.amount.toLocaleString('es-CL')}`;
    const monthName  = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][fee.month - 1];

    // Notify player
    const playerPayload = {
      title: '⚠️ Cuota vencida',
      body:  `Tu cuota de ${monthName} ${fee.year} (${amount}) está vencida.`,
      url:   '/player/payments',
    };

    for (const sub of fee.player.user.pushSubscriptions) {
      const ok = await sendPush(sub, playerPayload);
      if (ok) sent++;
      else await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
    }

    // Notify coach (if player has a team with a coach)
    const coach = fee.player.team?.coach;
    if (coach) {
      const coachPayload = {
        title: '💳 Cuota vencida',
        body:  `${playerName} — cuota ${monthName} ${fee.year} vencida (${amount})`,
        url:   '/admin/finanzas/cuotas',
      };
      for (const sub of coach.pushSubscriptions) {
        const ok = await sendPush(sub, coachPayload);
        if (ok) sent++;
        else await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
    }

    // Notify club admins
    const admins = await prisma.user.findMany({
      where: { clubId: fee.player.user.clubId, role: 'CLUB_ADMIN', isActive: true },
      include: { pushSubscriptions: true },
    });

    for (const admin of admins) {
      const adminPayload = {
        title: '💳 Cuota vencida',
        body:  `${playerName} — cuota ${monthName} ${fee.year} vencida (${amount})`,
        url:   '/admin/finanzas/cuotas',
      };
      for (const sub of admin.pushSubscriptions) {
        const ok = await sendPush(sub, adminPayload);
        if (ok) sent++;
        else await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
    }

    // Log reminder to avoid re-sending
    await prisma.feeReminder.create({
      data: { feeId: fee.id, type: 'OVERDUE_1DAY', channel: 'PUSH', success: true },
    }).catch(() => {});
  }

  return json({ ok: true, sent, ts: now.toISOString() });
}
