import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { getPagination, buildMeta } from '../utils/pagination.js';
import { queryLogs } from '../services/activityLogService.js';

// @desc    List activity logs with optional filters
// @route   GET /api/v1/activity-logs
export const listActivityLogs = asyncHandler(async (req, res) => {
  const { page, limit } = getPagination(req.query);

  const filter = {};
  if (req.query.action) filter.action = req.query.action;
  if (req.query.actor) filter.actor = req.query.actor;
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
  }

  const { items, total } = await queryLogs({ page, limit, filter });

  sendSuccess(res, { data: { logs: items }, meta: buildMeta({ page, limit, total }) });
});
