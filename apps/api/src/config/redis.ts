import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

let redis: Redis | null = null;

if (env.REDIS_URL) {
  redis = new Redis(env.REDIS_URL, {
    retryStrategy: (times) => {
      if (times > 3) {
        logger.warn('Redis unavailable, running without cache');
        return null;
      }
      return Math.min(times * 200, 2000);
    },
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
  });

  redis.on('connect', () => logger.info('Redis connected'));
  redis.on('error', () => { /* silenced — redis is optional in dev */ });

  redis.connect().catch(() => {
    logger.warn('Redis not available, continuing without cache');
    redis = null;
  });
}

export { redis };
