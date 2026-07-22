import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import Setting, { getSettings } from '../models/Setting.js';
import { logActivity } from '../services/activityLogService.js';
import { ACTIVITY_ACTIONS } from '../config/constants.js';

// @desc    Get platform settings
// @route   GET /api/v1/settings
export const getPlatformSettings = asyncHandler(async (req, res) => {
  const settings = await getSettings();
  sendSuccess(res, { data: { settings } });
});

// @desc    Update platform settings (deep merge)
// @route   PATCH /api/v1/settings
export const updatePlatformSettings = asyncHandler(async (req, res) => {
  const settings = await getSettings();

  const mergeDeep = (target, source) => {
    Object.keys(source).forEach((key) => {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) && target[key]) {
        mergeDeep(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    });
  };

  mergeDeep(settings, req.body);
  settings.updatedBy = req.admin._id;
  await settings.save();

  await logActivity({
    actor: req.admin,
    action: ACTIVITY_ACTIONS.SETTINGS_UPDATED,
    description: `${req.admin.name} updated platform settings`,
    req,
  });

  sendSuccess(res, { message: 'Settings updated', data: { settings } });
});
