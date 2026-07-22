import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as analyticsService from '../services/analyticsService.js';

// @desc    Dashboard summary stats
// @route   GET /api/v1/dashboard/stats
export const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await analyticsService.getDashboardStats();
  sendSuccess(res, { data: { stats } });
});

// @desc    Full analytics payload for the analytics page
// @route   GET /api/v1/analytics
export const getAnalytics = asyncHandler(async (req, res) => {
  const analytics = await analyticsService.getFullAnalytics();
  sendSuccess(res, { data: { analytics } });
});

// @desc    Monthly registrations series
// @route   GET /api/v1/analytics/monthly-registrations
export const getMonthlyRegistrations = asyncHandler(async (req, res) => {
  const months = Number(req.query.months) || 12;
  const data = await analyticsService.getMonthlyRegistrations(months);
  sendSuccess(res, { data: { monthlyRegistrations: data } });
});
