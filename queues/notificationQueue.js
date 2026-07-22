import { Queue } from 'bullmq';
import getRedisConnection from '../config/redis.js';
import { QUEUE_NAMES } from '../config/constants.js';

let notificationQueue;

export const getNotificationQueue = () => {
  if (notificationQueue) return notificationQueue;
  notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATION, { connection: getRedisConnection() });
  return notificationQueue;
};

/**
 * Enqueue creation of an in-app notification (and optionally a linked email).
 * @param {object} payload - matches Notification model shape
 */
export const queueNotification = async (payload, opts = {}) => {
  const queue = getNotificationQueue();
  return queue.add('create-notification', payload, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: { age: 60 * 60 * 24 * 3, count: 1000 },
    removeOnFail: { age: 60 * 60 * 24 * 14 },
    ...opts,
  });
};

export default { getNotificationQueue, queueNotification };
