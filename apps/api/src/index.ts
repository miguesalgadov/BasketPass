import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { env } from './config/env';
import { connectDatabase } from './config/database';
import { logger } from './config/logger';
import { errorHandler } from './middlewares/error.middleware';
import { authenticate } from './middlewares/auth.middleware';

import authRouter from './modules/auth/auth.router';
import playersRouter from './modules/players/players.router';
import teamsRouter from './modules/teams/teams.router';
import matchesRouter from './modules/matches/matches.router';
import attendanceRouter from './modules/attendance/attendance.router';
import paymentsRouter from './modules/payments/payments.router';
import statsRouter from './modules/stats/stats.router';
import trainingsRouter from './modules/trainings/trainings.router';
import documentsRouter from './modules/documents/documents.router';
import chatRouter from './modules/chat/chat.router';
import calendarRouter from './modules/calendar/calendar.router';
import feesRouter            from './modules/fees/fees.router';
import feeTypesRouter        from './modules/fees/fee-types.router';
import championshipsRouter   from './modules/championships/championships.router';
import nominationsRouter    from './modules/nominations/nominations.router';
import finanzasRouter       from './modules/finanzas/finanzas.router';

import { startPaymentRemindersJob }    from './jobs/payment-reminders.job';
import { startGenerateMonthlyFeesJob } from './jobs/generate-monthly-fees.job';
import { registerStatsGateway }        from './modules/stats/stats-gateway';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: env.FRONTEND_URL,
    credentials: true,
  },
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'production' ? 300 : 2000,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
const v1 = express.Router();

v1.use('/auth', authRouter);
v1.use('/players', authenticate, playersRouter);
v1.use('/teams', authenticate, teamsRouter);
v1.use('/matches', authenticate, matchesRouter);
v1.use('/attendance', authenticate, attendanceRouter);
v1.use('/payments', authenticate, paymentsRouter);
v1.use('/stats', authenticate, statsRouter);
v1.use('/trainings', authenticate, trainingsRouter);
v1.use('/documents', authenticate, documentsRouter);
v1.use('/chat', authenticate, chatRouter);
v1.use('/calendar',   calendarRouter);  // token auth is handled per-route (feed.ics is public)
v1.use('/fees',            authenticate, feesRouter);
v1.use('/fee-types',       authenticate, feeTypesRouter);
v1.use('/championships',   authenticate, championshipsRouter);
v1.use('/nominations',    authenticate, nominationsRouter);
v1.use('/finanzas',       authenticate, finanzasRouter);

app.use('/api/v1', v1);

// Stats WebSocket gateway (separate namespace /stats)
registerStatsGateway(io);

// Socket.io
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication required'));
  next();
});

io.on('connection', (socket) => {
  logger.debug(`Socket connected: ${socket.id}`);

  socket.on('join:team', (teamId: string) => {
    socket.join(`team:${teamId}`);
  });

  socket.on('join:club', (clubId: string) => {
    socket.join(`club:${clubId}`);
  });

  socket.on('message:send', (data: { teamId: string; content: string }) => {
    io.to(`team:${data.teamId}`).emit('message:new', {
      ...data,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('disconnect', () => {
    logger.debug(`Socket disconnected: ${socket.id}`);
  });
});

// Error handler (must be last)
app.use(errorHandler);

async function bootstrap() {
  await connectDatabase();
  startPaymentRemindersJob();
  startGenerateMonthlyFeesJob();

  httpServer.listen(env.PORT, () => {
    logger.info(`BasketPass API running on port ${env.PORT} [${env.NODE_ENV}]`);
  });
}

bootstrap().catch((err) => {
  logger.error('Failed to start server', { error: err });
  process.exit(1);
});

export { io };
