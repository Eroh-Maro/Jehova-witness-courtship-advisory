import { createAndDispatchNotification } from "../services/notificationService.js";

/**
 * Compatibility wrapper after removing BullMQ.
 * Existing code can still call queueNotification().
 */
export const queueNotification = async (payload) => {
  return createAndDispatchNotification(payload);
};

export default {
  queueNotification,
};