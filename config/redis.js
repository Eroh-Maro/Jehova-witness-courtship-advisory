import IORedis from 'ioredis';
import logger from '../utils/logger.js';

let connection;

export const getRedisConnection = () => {
  if (connection) return connection;

  connection = new IORedis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
  });

  connection.on('connect', () => logger.info('Redis connected'));
  connection.on('error', (err) => logger.error(`Redis error: ${err.message}`));

  return connection;
};

export default getRedisConnection;
