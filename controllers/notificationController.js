import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { getPagination } from '../utils/pagination.js';
import * as notificationService from '../services/notificationService.js';

// @desc    List notifications for the current admin
// @route   GET /api/v1/notifications
export const listNotifications = asyncHandler(async (req, res) => {
  const { page, limit } = getPagination(req.query);
  const unreadOnly = req.query.unreadOnly === 'true';

  const { items, total, unreadCount } = await notificationService.listForAdmin(req.admin._id, { page, limit, unreadOnly });

  sendSuccess(res, { data: { notifications: items, unreadCount }, meta: { page, limit, total } });
});

// @desc    Mark a single notification as read
// @route   PATCH /api/v1/notifications/:id/read
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(req.admin._id, req.params.id);
  if (!notification) throw ApiError.notFound('Notification not found');
  sendSuccess(res, { message: 'Notification marked as read', data: { notification } });
});

// @desc    Mark all notifications as read
// @route   PATCH /api/v1/notifications/read-all
export const markAllAsRead = asyncHandler(async (req, res) => {
  await notificationService.markAllAsRead(req.admin._id);
  sendSuccess(res, { message: 'All notifications marked as read' });
});
