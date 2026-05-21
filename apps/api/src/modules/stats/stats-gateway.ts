import { Server, Socket } from 'socket.io';
import { prisma } from '@/config/database';
import { statsService } from './stats.service';
import type { LogActionDto } from './stats.schema';
import jwt from 'jsonwebtoken';

function verifyToken(token: string): any {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || 'secret');
  } catch {
    return null;
  }
}

function canLogStats(user: any): boolean {
  if (!user) return false;
  return ['CLUB_ADMIN', 'SUPER_ADMIN', 'STATISTICIAN'].includes(user.role);
}

export function registerStatsGateway(io: Server): void {
  const statsNsp = io.of('/stats');

  statsNsp.on('connection', (socket: Socket) => {
    // ── join:match ──────────────────────────────────────────────────────────
    socket.on(
      'join:match',
      async ({ sessionId, token }: { sessionId: string; token: string }) => {
        const payload = verifyToken(token);
        if (!payload) {
          socket.emit('error', { code: 'UNAUTHORIZED' });
          return;
        }

        const user = await prisma.user.findUnique({
          where: { id: payload.id ?? payload.sub },
        });
        socket.data.user = user;
        socket.data.sessionId = sessionId;
        socket.join(`match:${sessionId}`);

        try {
          const state = await statsService.getSession(sessionId);
          socket.emit('state:sync', state);
        } catch {
          // session may not exist yet — silently ignore
        }
      },
    );

    // ── action:log ──────────────────────────────────────────────────────────
    socket.on(
      'action:log',
      async (payload: LogActionDto & { sessionId: string }) => {
        if (!canLogStats(socket.data.user)) {
          socket.emit('error', {
            code: 'UNAUTHORIZED',
            message: 'Sin permiso para ingresar estadísticas',
          });
          return;
        }
        try {
          const result = await statsService.logAction(
            payload.sessionId,
            payload,
          );
          const state = await statsService.getSession(payload.sessionId);
          statsNsp
            .to(`match:${payload.sessionId}`)
            .emit('action:logged', {
              play: result.play,
              scoreUpdate: { home: result.homeScore, away: result.awayScore },
              lineups: { home: state.home.players, away: state.away.players },
            });
        } catch (e: any) {
          socket.emit('error', { code: 'LOG_FAILED', message: e.message });
        }
      },
    );

    // ── action:undo ─────────────────────────────────────────────────────────
    socket.on('action:undo', async ({ sessionId }: { sessionId: string }) => {
      if (!canLogStats(socket.data.user)) return;
      try {
        const result = await statsService.undoLastAction(
          sessionId,
          socket.data.user.id,
        );
        const state = await statsService.getSession(sessionId);
        statsNsp.to(`match:${sessionId}`).emit('action:reverted', {
          undonePlayId: result.undonePlayId,
          scoreUpdate: {
            home: state.homeScore,
            away: state.awayScore,
          },
          lineups: { home: state.home.players, away: state.away.players },
        });
      } catch (e: any) {
        socket.emit('error', { code: 'UNDO_FAILED', message: e.message });
      }
    });

    // ── period:advance ──────────────────────────────────────────────────────
    socket.on(
      'period:advance',
      async ({ sessionId }: { sessionId: string }) => {
        if (!canLogStats(socket.data.user)) return;
        try {
          const session = await statsService.advancePeriod(sessionId);
          statsNsp.to(`match:${sessionId}`).emit('period:changed', {
            period: session.period,
            clockSeconds: session.clockSeconds,
            status: session.status,
          });
        } catch {
          // ignore
        }
      },
    );

    // ── match:finish ────────────────────────────────────────────────────────
    socket.on(
      'match:finish',
      async ({ sessionId }: { sessionId: string }) => {
        if (!canLogStats(socket.data.user)) return;
        await statsService.finishSession(sessionId);
        statsNsp
          .to(`match:${sessionId}`)
          .emit('match:finished', { sessionId });
      },
    );

    // ── clock:update ────────────────────────────────────────────────────────
    socket.on(
      'clock:update',
      async ({
        sessionId,
        clockSeconds,
      }: {
        sessionId: string;
        clockSeconds: number;
      }) => {
        if (!canLogStats(socket.data.user)) return;
        await statsService.updateClock(sessionId, clockSeconds);
        statsNsp
          .to(`match:${sessionId}`)
          .emit('clock:updated', { clockSeconds });
      },
    );

    // ── disconnect ──────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      if (socket.data.sessionId) {
        socket.leave(`match:${socket.data.sessionId}`);
      }
    });
  });
}
