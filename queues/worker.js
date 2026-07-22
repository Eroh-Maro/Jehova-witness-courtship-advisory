import 'dotenv/config';
import { Worker } from 'bullmq';
import mongoose from 'mongoose';
import getRedisConnection from '../config/redis.js';
import connectDB from '../config/db.js';
import logger from '../utils/logger.js';
import { sendEmail } from '../services/emailService.js';
import { createAndDispatchNotification } from '../services/notificationService.js';
import { QUEUE_NAMES } from '../config/constants.js';

await connectDB();

const connection = getRedisConnection();

const emailWorker = new Worker(
  QUEUE_NAMES.EMAIL,
  async (job) => {
    const { to, subject, template, variables, attachments } = job.data;
    await sendEmail({ to, subject, template, variables, attachments });
  },
  { connection, concurrency: 5 }
);

const notificationWorker = new Worker(
  QUEUE_NAMES.NOTIFICATION,
  async (job) => {
    await createAndDispatchNotification(job.data);
  },
  { connection, concurrency: 10 }
);

[emailWorker, notificationWorker].forEach((worker) => {
  worker.on('completed', (job) => logger.info(`[${worker.name}] Job ${job.id} completed`));
  worker.on('failed', (job, err) => logger.error(`[${worker.name}] Job ${job?.id} failed: ${err.message}`));
});

logger.info('Queue workers started (email, notification)');

process.on('SIGTERM', async () => {
  await Promise.all([emailWorker.close(), notificationWorker.close()]);
  await mongoose.connection.close();
  process.exit(0);
});
