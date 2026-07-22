import { Queue } from 'bullmq';
import getRedisConnection from '../config/redis.js';
import { QUEUE_NAMES } from '../config/constants.js';

let emailQueue;

export const getEmailQueue = () => {
  if (emailQueue) return emailQueue;
  emailQueue = new Queue(QUEUE_NAMES.EMAIL, { connection: getRedisConnection() });
  return emailQueue;
};

/**
 * Enqueue an email job. Never call emailService.sendEmail directly from a controller.
 * @param {object} payload - { to, subject, template, variables, attachments }
 * @param {object} opts - BullMQ job options: { delay, repeat, attempts, jobId }
 */
export const queueEmail = async (payload, opts = {}) => {
  const queue = getEmailQueue();
  return queue.add('send-email', payload, {
    attempts: 5,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 60 * 60 * 24 * 7, count: 1000 },
    removeOnFail: { age: 60 * 60 * 24 * 30 },
    ...opts,
  });
};

/**
 * Convenience for scheduling an email at a future point in time.
 * @param {object} payload
 * @param {Date} sendAt
 */
export const scheduleEmail = (payload, sendAt) => {
  const delay = Math.max(new Date(sendAt).getTime() - Date.now(), 0);
  return queueEmail(payload, { delay });
};

/**
 * Convenience for recurring emails (weekly digest, daily summary, etc.)
 * @param {object} payload
 * @param {string} cronPattern - e.g. '0 8 * * MON'
 * @param {string} jobId - stable id so re-registering doesn't duplicate the repeat job
 */
export const scheduleRecurringEmail = (payload, cronPattern, jobId) =>
  queueEmail(payload, { repeat: { pattern: cronPattern }, jobId });

export default { getEmailQueue, queueEmail, scheduleEmail, scheduleRecurringEmail };
