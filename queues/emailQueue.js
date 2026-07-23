import { sendEmail } from '../services/emailService.js';

/**
 * Send an email directly without Redis or BullMQ.
 *
 * Existing controllers can continue calling queueEmail(payload).
 */
export const queueEmail = async (payload) => {
  return sendEmail(payload);
};

/**
 * Schedule an email in memory.
 *
 * Important: this only works while the Node process remains running.
 * It should not be used for long-term production scheduling.
 */
export const scheduleEmail = (payload, sendAt) => {
  const delay = Math.max(new Date(sendAt).getTime() - Date.now(), 0);

  const timer = setTimeout(() => {
    sendEmail(payload).catch((error) => {
      console.error('Scheduled email failed:', error);
    });
  }, delay);

  timer.unref?.();

  return {
    scheduled: true,
    sendAt: new Date(sendAt),
  };
};

/**
 * BullMQ recurring email scheduling has been removed.
 */
export const scheduleRecurringEmail = () => {
  throw new Error(
    'Recurring email scheduling is unavailable because Redis and BullMQ have been removed.'
  );
};

export default {
  queueEmail,
  scheduleEmail,
  scheduleRecurringEmail,
};