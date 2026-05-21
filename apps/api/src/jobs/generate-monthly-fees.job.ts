import cron from 'node-cron';
import { prisma } from '@/config/database';
import { logger } from '@/config/logger';
import { feesService } from '@/modules/fees/fees.service';

export function startGenerateMonthlyFeesJob() {
  // Day 1 of each month at 00:05 AM (Santiago time)
  cron.schedule('5 0 1 * *', async () => {
    const now   = new Date();
    const year  = now.getFullYear();
    const month = now.getMonth() + 1;
    logger.info(`Generating monthly fees — ${month}/${year}`);

    try {
      const clubs = await prisma.club.findMany({ where: { isActive: true }, select: { id: true, name: true } });
      for (const club of clubs) {
        try {
          const result = await feesService.generateMonthly(club.id, { year, month });
          logger.info(`[${club.name}] Generated ${result.created} fees for ${month}/${year}`);
        } catch (err) {
          logger.error(`Failed to generate fees for club ${club.id}`, { error: err });
        }
      }
    } catch (error) {
      logger.error('generate-monthly-fees job failed', { error });
    }
  }, { timezone: 'America/Santiago' });

  logger.info('Generate-monthly-fees cron job started');
}
