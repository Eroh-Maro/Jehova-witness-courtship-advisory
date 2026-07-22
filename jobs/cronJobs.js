import cron from 'node-cron';
import Admin from '../models/Admin.js';
import Profile from '../models/Profile.js';
import Contact from '../models/Contact.js';
import Match from '../models/Match.js';
import Notification from '../models/Notification.js';
import { getSettings } from '../models/Setting.js';
import { queueEmail } from '../queues/emailQueue.js';
import logger from '../utils/logger.js';
import { EMAIL_TEMPLATES, PROFILE_STATUS, CONTACT_STATUS, MATCH_STATUS, ROLES } from '../config/constants.js';

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

// Daily admin summary — 7:00 AM every day
const scheduleDailyAdminSummary = () => {
  cron.schedule('0 7 * * *', async () => {
    const settings = await getSettings();
    if (!settings.notificationPreferences.dailyAdminSummary) return;

    const [pendingProfiles, pendingContacts, pendingMatches, admins] = await Promise.all([
      Profile.countDocuments({ status: PROFILE_STATUS.PENDING }),
      Contact.countDocuments({ status: CONTACT_STATUS.NEW }),
      Match.countDocuments({ status: MATCH_STATUS.PENDING_APPROVAL }),
      Admin.find({ role: { $in: [ROLES.SUPER_ADMIN, ROLES.ADMIN] }, isActive: true, 'notificationPreferences.email': true }),
    ]);

    await Promise.all(
      admins.map((admin) =>
        queueEmail({
          to: admin.email,
          subject: 'Daily Admin Summary',
          template: EMAIL_TEMPLATES.DAILY_ADMIN_SUMMARY,
          variables: {
            date: new Date().toDateString(),
            pendingProfiles,
            pendingContacts,
            pendingMatches,
            dashboardUrl: `${process.env.CLIENT_URL}/Admin/admin.html`,
          },
        })
      )
    );
    logger.info(`Daily admin summary queued for ${admins.length} admins`);
  });
};

// Weekly digest — 8:00 AM every Monday
const scheduleWeeklyDigest = () => {
  cron.schedule('0 8 * * MON', async () => {
    const settings = await getSettings();
    if (!settings.notificationPreferences.weeklyDigest) return;

    const since = daysAgo(7);
    const [newProfiles, approvedProfiles, newContacts, newMatches, admins] = await Promise.all([
      Profile.countDocuments({ createdAt: { $gte: since } }),
      Profile.countDocuments({ status: PROFILE_STATUS.APPROVED, approvedAt: { $gte: since } }),
      Contact.countDocuments({ createdAt: { $gte: since } }),
      Match.countDocuments({ createdAt: { $gte: since } }),
      Admin.find({ role: { $in: [ROLES.SUPER_ADMIN, ROLES.ADMIN] }, isActive: true, 'notificationPreferences.email': true }),
    ]);

    await Promise.all(
      admins.map((admin) =>
        queueEmail({
          to: admin.email,
          subject: 'Your Weekly Digest',
          template: EMAIL_TEMPLATES.WEEKLY_DIGEST,
          variables: {
            weekOf: since.toDateString(),
            newProfiles,
            approvedProfiles,
            newContacts,
            newMatches,
            dashboardUrl: `${process.env.CLIENT_URL}/Admin/admin.html`,
          },
        })
      )
    );
    logger.info(`Weekly digest queued for ${admins.length} admins`);
  });
};

// Archive notifications older than 90 days (mark as read+archived state via deletion of very old read notifications) — 2:00 AM daily
const scheduleArchiveOldNotifications = () => {
  cron.schedule('0 2 * * *', async () => {
    const result = await Notification.deleteMany({ isRead: true, readAt: { $lte: daysAgo(90) } });
    logger.info(`Archived (deleted) ${result.deletedCount} old read notifications`);
  });
};

// Cleanup expired password reset tokens — 3:00 AM daily
const scheduleCleanupExpiredSessions = () => {
  cron.schedule('0 3 * * *', async () => {
    const result = await Admin.updateMany(
      { passwordResetExpires: { $lte: new Date() } },
      { $set: { passwordResetTokenHash: null, passwordResetExpires: null } }
    );
    logger.info(`Cleaned up ${result.modifiedCount} expired password reset tokens`);
  });
};

// Auto-archive stale matches based on settings.matchRules.autoArchiveAfterDaysInactive — 4:00 AM daily
const scheduleAutoArchiveStaleMatches = () => {
  cron.schedule('0 4 * * *', async () => {
    const settings = await getSettings();
    const cutoff = daysAgo(settings.matchRules.autoArchiveAfterDaysInactive);

    const result = await Match.updateMany(
      { status: { $nin: [MATCH_STATUS.MARRIED, MATCH_STATUS.ARCHIVED] }, updatedAt: { $lte: cutoff } },
      { $set: { status: MATCH_STATUS.ARCHIVED, archivedReason: 'Automatically archived due to inactivity' } }
    );
    logger.info(`Auto-archived ${result.modifiedCount} inactive matches`);
  });
};

// Placeholder daily backup job — 1:00 AM daily. In production this would trigger
// a `mongodump` to cloud storage or use MongoDB Atlas' native backup/snapshot API.
const scheduleDailyBackup = () => {
  cron.schedule('0 1 * * *', async () => {
    const settings = await getSettings();
    if (!settings.backup.autoBackupEnabled) return;
    logger.info(`Daily backup triggered (frequency: ${settings.backup.frequency}, retention: ${settings.backup.retentionDays} days)`);
    // Integrate with your backup provider / Atlas API here.
  });
};

export const initCronJobs = () => {
  scheduleDailyAdminSummary();
  scheduleWeeklyDigest();
  scheduleArchiveOldNotifications();
  scheduleCleanupExpiredSessions();
  scheduleAutoArchiveStaleMatches();
  scheduleDailyBackup();
  logger.info('Cron jobs initialized');
};

export default { initCronJobs };
