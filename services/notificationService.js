import Notification from '../models/Notification.js';
import Admin from '../models/Admin.js';
import { queueNotification } from '../queues/notificationQueue.js';
import { queueEmail } from '../queues/emailQueue.js';
import { NOTIFICATION_AUDIENCE, ROLES, EMAIL_TEMPLATES } from '../config/constants.js';

/**
 * Determine which roles should see a given notification audience.
 */
const audienceToRoles = (audience) => {
  switch (audience) {
    case NOTIFICATION_AUDIENCE.SUPER_ADMIN:
      return [ROLES.SUPER_ADMIN];
    case NOTIFICATION_AUDIENCE.ADMIN_AND_ABOVE:
      return [ROLES.SUPER_ADMIN, ROLES.ADMIN];
    case NOTIFICATION_AUDIENCE.ALL:
    default:
      return [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.COORDINATOR];
  }
};

/**
 * High-level API used by controllers/services: enqueues notification creation
 * so the HTTP request is never blocked by DB writes / email dispatch.
 */
export const notify = async ({ type, title, message, link = null, recipientId = null, audience = NOTIFICATION_AUDIENCE.ADMIN_AND_ABOVE, relatedEntity = null, sendEmailToo = false }) => {
  const recipientRoles = recipientId ? [] : audienceToRoles(audience);
  return queueNotification({
    type,
    title,
    message,
    link,
    recipient: recipientId,
    recipientRoles,
    relatedEntity,
    sendEmailToo,
  });
};

/**
 * Called by the notification worker to actually persist the notification and
 * fan it out to matching admins, optionally triggering an email as well.
 */
export const createAndDispatchNotification = async (payload) => {
  const { recipient, recipientRoles, sendEmailToo, ...rest } = payload;

  let targets = [];
  if (recipient) {
    targets = [recipient];
  } else {
    const admins = await Admin.find({ role: { $in: recipientRoles }, isActive: true }).select('_id email name notificationPreferences');
    targets = admins;
  }

  const docs = (recipient ? [{ _id: recipient }] : targets).map((admin) => ({
    ...rest,
    recipient: admin._id,
  }));

  const created = await Notification.insertMany(docs);

  if (sendEmailToo) {
    const adminDocs = recipient
      ? await Admin.find({ _id: recipient }).select('email name notificationPreferences')
      : targets;

    await Promise.all(
      adminDocs
        .filter((a) => a.notificationPreferences?.email !== false)
        .map((a) =>
          queueEmail({
            to: a.email,
            subject: rest.title,
            template: EMAIL_TEMPLATES.ADMIN_NOTIFICATION,
            variables: {
              notificationTitle: rest.title,
              notificationMessage: rest.message,
              actionUrl: `${process.env.CLIENT_URL}${rest.link || '/1dama3na/admin.html'}`,
            },
          })
        )
    );
  }

  return created;
};

export const listForAdmin = async (adminId, { page = 1, limit = 20, unreadOnly = false } = {}) => {
  const filter = { recipient: adminId };
  if (unreadOnly) filter.isRead = false;

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: adminId, isRead: false }),
  ]);

  return { items, total, unreadCount };
};

export const markAsRead = async (adminId, notificationId) =>
  Notification.findOneAndUpdate(
    { _id: notificationId, recipient: adminId },
    { isRead: true, readAt: new Date() },
    { new: true }
  );

export const markAllAsRead = async (adminId) =>
  Notification.updateMany({ recipient: adminId, isRead: false }, { isRead: true, readAt: new Date() });

export default { notify, createAndDispatchNotification, listForAdmin, markAsRead, markAllAsRead };
