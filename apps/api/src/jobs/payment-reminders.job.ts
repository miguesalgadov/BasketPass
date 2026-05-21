import cron from 'node-cron';
import { prisma } from '@/config/database';
import { logger } from '@/config/logger';
import { feesRepository } from '@/modules/fees/fees.repository';

const REMINDER_TYPES = {
  PRE_DUE_3DAYS: 'PRE_DUE_3DAYS',
  PRE_DUE_1DAY:  'PRE_DUE_1DAY',
  DUE_TODAY:     'DUE_TODAY',
  OVERDUE_1DAY:  'OVERDUE_1DAY',
  OVERDUE_7DAYS: 'OVERDUE_7DAYS',
  OVERDUE_30DAYS:'OVERDUE_30DAYS',
} as const;

function addDays(date: Date, days: number) {
  const d = new Date(date); d.setDate(d.getDate() + days); return d;
}

async function shouldSend(feeId: string, type: string): Promise<boolean> {
  const existing = await prisma.feeReminder.findFirst({ where: { feeId, type } });
  return !existing;
}

async function logReminder(feeId: string, type: string, success: boolean, errorMsg?: string) {
  await prisma.feeReminder.create({
    data: { feeId, type, channel: 'EMAIL', success, errorMsg },
  }).catch(() => {});
}

async function runRemindersAndMarkOverdue() {
  logger.info('Running fee reminders job');
  try {
    const today     = new Date();
    const in3Days   = addDays(today, 3);
    const in1Day    = addDays(today, 1);
    const yesterday = addDays(today, -1);

    const preDue3 = await feesRepository.findByDueDate(in3Days, ['PENDING']);
    for (const fee of preDue3) {
      if (await shouldSend(fee.id, REMINDER_TYPES.PRE_DUE_3DAYS)) {
        logger.info(`PRE_DUE_3DAYS reminder for fee ${fee.id}`);
        await logReminder(fee.id, REMINDER_TYPES.PRE_DUE_3DAYS, true);
      }
    }

    const preDue1 = await feesRepository.findByDueDate(in1Day, ['PENDING']);
    for (const fee of preDue1) {
      if (await shouldSend(fee.id, REMINDER_TYPES.PRE_DUE_1DAY)) {
        logger.info(`PRE_DUE_1DAY reminder for fee ${fee.id}`);
        await logReminder(fee.id, REMINDER_TYPES.PRE_DUE_1DAY, true);
      }
    }

    const dueToday = await feesRepository.findByDueDate(today, ['PENDING']);
    for (const fee of dueToday) {
      if (await shouldSend(fee.id, REMINDER_TYPES.DUE_TODAY)) {
        logger.info(`DUE_TODAY reminder for fee ${fee.id}`);
        await logReminder(fee.id, REMINDER_TYPES.DUE_TODAY, true);
      }
    }

    const nowOverdue = await feesRepository.findByDueDate(yesterday, ['PENDING']);
    for (const fee of nowOverdue) {
      await prisma.fee.update({ where: { id: fee.id }, data: { status: 'OVERDUE' } });
      if (await shouldSend(fee.id, REMINDER_TYPES.OVERDUE_1DAY)) {
        logger.info(`OVERDUE_1DAY reminder for fee ${fee.id}`);
        await logReminder(fee.id, REMINDER_TYPES.OVERDUE_1DAY, true);
      }
    }

    // Mark any stale PENDING as OVERDUE (handles missed days / server downtime)
    const marked = await feesRepository.markOverdue(today);
    if (marked.count > 0) logger.info(`Marked ${marked.count} stale fees as OVERDUE`);

    const overdue7 = await feesRepository.findOverdueDaysAgo(7);
    for (const fee of overdue7) {
      if (await shouldSend(fee.id, REMINDER_TYPES.OVERDUE_7DAYS)) {
        logger.info(`OVERDUE_7DAYS reminder for fee ${fee.id}`);
        await logReminder(fee.id, REMINDER_TYPES.OVERDUE_7DAYS, true);
      }
    }

    const overdue30 = await feesRepository.findOverdueDaysAgo(30);
    for (const fee of overdue30) {
      if (await shouldSend(fee.id, REMINDER_TYPES.OVERDUE_30DAYS)) {
        logger.info(`OVERDUE_30DAYS (critical) for fee ${fee.id}`);
        await logReminder(fee.id, REMINDER_TYPES.OVERDUE_30DAYS, true);
      }
    }

    logger.info('Fee reminders job completed');
  } catch (error) {
    logger.error('Fee reminders job failed', { error });
  }
}

export function startPaymentRemindersJob() {
  // Run immediately on startup to catch up any missed overdue marking
  runRemindersAndMarkOverdue();

  // Daily at 9 AM (Santiago time)
  cron.schedule('0 9 * * *', runRemindersAndMarkOverdue, { timezone: 'America/Santiago' });

  logger.info('Fee reminders cron job started');
}
