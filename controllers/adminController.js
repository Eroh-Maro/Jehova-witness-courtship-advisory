import Admin from '../models/Admin.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { getPagination, buildMeta } from '../utils/pagination.js';
import { logActivity } from '../services/activityLogService.js';
import { ACTIVITY_ACTIONS, ROLES } from '../config/constants.js';

// @desc    List all admin accounts
// @route   GET /api/v1/admins
export const listAdmins = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  const [items, total] = await Promise.all([
    Admin.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Admin.countDocuments(filter),
  ]);

  sendSuccess(res, { data: { admins: items }, meta: buildMeta({ page, limit, total }) });
});

// @desc    Update an admin's role or active status
// @route   PATCH /api/v1/admins/:id
export const updateAdmin = asyncHandler(async (req, res) => {
  const target = await Admin.findById(req.params.id);
  if (!target) throw ApiError.notFound('Admin not found');

  if (String(target._id) === String(req.admin._id) && req.body.isActive === false) {
    throw ApiError.badRequest('You cannot deactivate your own account');
  }

  if (req.body.role && Object.values(ROLES).includes(req.body.role)) target.role = req.body.role;
  if (req.body.isActive !== undefined) target.isActive = req.body.isActive;
  if (req.body.isActive === false) target.tokenVersion += 1; // force logout

  await target.save();

  await logActivity({
    actor: req.admin,
    action: ACTIVITY_ACTIONS.SETTINGS_UPDATED,
    description: `${req.admin.name} updated admin account ${target.email}`,
    targetEntity: { kind: 'Admin', id: target._id },
    req,
  });

  sendSuccess(res, { message: 'Admin updated', data: { admin: target.toSafeObject() } });
});

// @desc    Assign countries to an admin
// @route   PATCH /api/v1/admins/:id/countries
export const assignAdminCountries = asyncHandler(async (req, res) => {
  const { assignedCountries, canHandleInternational } = req.body;

  const admin = await Admin.findById(req.params.id);

  if (!admin) {
    throw ApiError.notFound("Admin not found");
  }

  if (assignedCountries !== undefined) {
    admin.assignedCountries = assignedCountries;
  }

  if (canHandleInternational !== undefined) {
    admin.canHandleInternational = canHandleInternational;
  }

  await admin.save();

  await logActivity({
    actor: req.admin,
    action: ACTIVITY_ACTIONS.SETTINGS_UPDATED,
    description: `${req.admin.name} updated country assignments for ${admin.email}`,
    targetEntity: {
      kind: "Admin",
      id: admin._id,
    },
    req,
  });

  sendSuccess(res, {
    message: "Admin countries updated",
    data: {
      admin: admin.toSafeObject(),
    },
  });
});
// @desc    Delete an admin account
// @route   DELETE /api/v1/admins/:id
export const deleteAdmin = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.admin._id)) {
    throw ApiError.badRequest('You cannot delete your own account');
  }
  const target = await Admin.findByIdAndDelete(req.params.id);
  if (!target) throw ApiError.notFound('Admin not found');

  await logActivity({
    actor: req.admin,
    action: ACTIVITY_ACTIONS.SETTINGS_UPDATED,
    description: `${req.admin.name} deleted admin account ${target.email}`,
    req,
  });

  sendSuccess(res, { message: 'Admin deleted' });
});
