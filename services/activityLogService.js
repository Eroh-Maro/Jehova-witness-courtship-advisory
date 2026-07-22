import ActivityLog from '../models/ActivityLog.js';

export const logActivity = async ({ actor, action, description, targetEntity = null, req = null, metadata = {} }) => {
  try {
    await ActivityLog.create({
      actor: actor._id || actor,
      actorName: actor.name || 'Unknown',
      action,
      description,
      targetEntity,
      ipAddress: req?.ip || null,
      userAgent: req?.headers?.['user-agent'] || null,
      metadata,
    });
  } catch (err) {
    // Activity logging must never break the primary request flow.
    // eslint-disable-next-line no-console
    console.error('Failed to write activity log:', err.message);
  }
};

export const queryLogs = async ({ page = 1, limit = 20, sort = { createdAt: -1 }, filter = {} }) => {
  const [items, total] = await Promise.all([
    ActivityLog.find(filter)
      .populate('actor', 'name email role')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ActivityLog.countDocuments(filter),
  ]);
  return { items, total };
};

export default { logActivity, queryLogs };
