import crypto from "crypto";
import Admin from "../models/Admin.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  cookieOptions,
  hashRawToken,
  generateRawToken,
} from "../utils/token.js";
import { logActivity } from "../services/activityLogService.js";
import { queueEmail } from "../queues/emailQueue.js";
import {
  ACTIVITY_ACTIONS,
  EMAIL_TEMPLATES,
  ROLES,
} from "../config/constants.js";

const issueTokens = async (res, admin) => {
  const accessToken = generateAccessToken(admin);
  const refreshToken = generateRefreshToken(admin);
  res.cookie("refreshToken", refreshToken, cookieOptions());
  return accessToken;
};

// @desc    Register the very first super admin (only works when no admins exist)
// @route   POST /api/v1/auth/register-first-admin
export const registerFirstAdmin = asyncHandler(async (req, res) => {
  const existingCount = await Admin.countDocuments({});
  if (existingCount > 0) {
    throw ApiError.forbidden(
      "Initial admin already exists. Please contact your super admin for an invitation."
    );
  }

  const {
    name,
    email,
    password,
    assignedCountries = [],
  } = req.body;

  if (!Array.isArray(assignedCountries)) {
    throw ApiError.badRequest("assignedCountries must be an array");
  }

  if (assignedCountries.length > 0) {
    throw ApiError.badRequest(
      "Super Admins do not need assigned countries."
    );
  }

  const admin = await Admin.create({
    name,
    email,
    password,
    role: ROLES.SUPER_ADMIN,
    assignedCountries: [],
    canHandleInternational: true,
  });

  const accessToken = await issueTokens(res, admin);
  await queueEmail({
    to: admin.email,
    subject: "Welcome to the Marriage Advisory Platform",
    template: EMAIL_TEMPLATES.WELCOME,
    variables: { name: admin.name, role: admin.role },
  });

  await logActivity({
    actor: admin,
    action: ACTIVITY_ACTIONS.ADMIN_LOGIN,
    description: `${admin.name} created the initial super admin account`,
    req,
  });

  sendSuccess(res, {
    statusCode: 201,
    message: "Super admin account created",
    data: { admin: admin.toSafeObject(), accessToken },
  });
});

// @desc    Admin login
// @route   POST /api/v1/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const admin = await Admin.findOne({ email }).select("+password");
  if (!admin || !(await admin.comparePassword(password))) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  if (!admin.isActive) {
    throw ApiError.forbidden(
      "This account has been deactivated. Contact your super admin."
    );
  }

  admin.lastLoginAt = new Date();
  admin.lastLoginIp = req.ip;
  await admin.save();

  const accessToken = await issueTokens(res, admin);

  await logActivity({
    actor: admin,
    action: ACTIVITY_ACTIONS.ADMIN_LOGIN,
    description: `${admin.name} logged in`,
    req,
  });

  sendSuccess(res, {
    message: "Login successful",
    data: { admin: admin.toSafeObject(), accessToken },
  });
});

// @desc    Logout - invalidate refresh token cookie and bump tokenVersion
// @route   POST /api/v1/auth/logout
export const logout = asyncHandler(async (req, res) => {
  res.clearCookie("refreshToken", cookieOptions());
  if (req.admin) {
    await logActivity({
      actor: req.admin,
      action: ACTIVITY_ACTIONS.ADMIN_LOGOUT,
      description: `${req.admin.name} logged out`,
      req,
    });
  }
  sendSuccess(res, { message: "Logged out successfully" });
});

// @desc    Issue a new access token from a valid refresh token cookie
// @route   POST /api/v1/auth/refresh
export const refresh = asyncHandler(async (req, res) => {
  const token = req.signedCookies?.refreshToken;
  if (!token) throw ApiError.unauthorized("Refresh token missing");

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch (err) {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }

  const admin = await Admin.findById(decoded.id);
  if (
    !admin ||
    !admin.isActive ||
    admin.tokenVersion !== decoded.tokenVersion
  ) {
    throw ApiError.unauthorized("Session no longer valid, please log in again");
  }

  const accessToken = generateAccessToken(admin);
  sendSuccess(res, { message: "Token refreshed", data: { accessToken } });
});

// @desc    Super admin invites a new admin/coordinator by email
// @route   POST /api/v1/auth/invite
export const inviteAdmin = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    role,
    assignedCountries = [],
    canHandleInternational = false,
  } = req.body;

  if (!Object.values(ROLES).includes(role)) {
    throw ApiError.badRequest("Invalid role");
  }

  const existing = await Admin.findOne({ email });
  if (existing)
    throw ApiError.conflict("An account with this email already exists");

  if (!Array.isArray(assignedCountries)) {
    throw ApiError.badRequest("assignedCountries must be an array");
  }

  if (role === ROLES.SUPER_ADMIN) {
    if (assignedCountries.length) {
      throw ApiError.badRequest(
        "Super Admins do not need assigned countries."
      );
    }
  } else if (canHandleInternational && assignedCountries.length > 0) {
    throw ApiError.badRequest(
      "International admins cannot have assigned countries."
    );
  } else if (!canHandleInternational && assignedCountries.length === 0) {
    throw ApiError.badRequest(
      "Assign at least one country or enable international access."
    );
  }

  const tempPassword = crypto.randomBytes(9).toString("base64");
  const admin = await Admin.create({
    name,
    email,
    password: tempPassword,
    role,
    assignedCountries: [
      ...new Set(
        assignedCountries
          .map(country => country.trim().toUpperCase())
          .filter(Boolean)
      ),
    ],
    canHandleInternational:
      role === ROLES.SUPER_ADMIN ? true : canHandleInternational,
    invitedBy: req.admin._id,
  });
  const rawToken = generateRawToken();
  admin.passwordResetTokenHash = hashRawToken(rawToken);
  admin.passwordResetExpires = Date.now() + 48 * 60 * 60 * 1000;
  await admin.save();

  await queueEmail({
    to: admin.email,
    subject: "You have been invited to the Marriage Advisory Platform",
    template: EMAIL_TEMPLATES.ADMIN_INVITATION,
    variables: {
      name: admin.name,
      invitedByName: req.admin.name,
      role: admin.role,
setupUrl: `${process.env.FRONTEND_URL}/1dama3na/admin-signup.html?token=${rawToken}`},
  });

  await logActivity({
    actor: req.admin,
    action: ACTIVITY_ACTIONS.ADMIN_INVITED,
    description: `${req.admin.name} invited ${admin.email} as ${admin.role}`,
    targetEntity: { kind: "Admin", id: admin._id },
    req,
  });

  sendSuccess(res, {
    statusCode: 201,
    message: "Invitation sent",
    data: { admin: admin.toSafeObject() },
  });
});

// @desc    Accept administrator invitation and activate account
// @route   POST /api/v1/auth/accept-invite
export const acceptInvite = asyncHandler(async (req, res) => {
  const {
    token,
    password,
    confirmPassword,
  } = req.body;

  if (!token) {
    throw ApiError.badRequest("Invitation token is required");
  }

  if (!password || !confirmPassword) {
    throw ApiError.badRequest(
      "Password and password confirmation are required"
    );
  }

  if (password.length < 8) {
    throw ApiError.badRequest(
      "Password must be at least 8 characters long"
    );
  }

  if (password !== confirmPassword) {
    throw ApiError.badRequest("Passwords do not match");
  }

  const tokenHash = hashRawToken(token);

  const admin = await Admin.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpires: { $gt: Date.now() },
  }).select(
    "+password +passwordResetTokenHash +passwordResetExpires"
  );

  if (!admin) {
    throw ApiError.badRequest(
      "Invitation token is invalid or has expired"
    );
  }

  admin.password = password;
  admin.passwordResetTokenHash = null;
  admin.passwordResetExpires = null;
  admin.tokenVersion += 1;

  await admin.save();

  await logActivity({
    actor: admin,
    action: ACTIVITY_ACTIONS.ADMIN_LOGIN,
    description: `${admin.name} accepted their administrator invitation`,
    req,
  });

  await queueEmail({
    to: admin.email,
    subject: "Your administrator account is now active",
    template: EMAIL_TEMPLATES.WELCOME,
    variables: {
      name: admin.name,
      role: admin.role,
    },
  });

  sendSuccess(res, {
    message:
      "Administrator account activated successfully. Please log in.",
    data: {
      admin: admin.toSafeObject(),
    },
  });
});

// @desc    Request a password reset email
// @route   POST /api/v1/auth/forgot-password
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const admin = await Admin.findOne({ email });

  // Always respond with success to avoid leaking which emails are registered.
  if (!admin) {
    return sendSuccess(res, {
      message: "If that email exists, a reset link has been sent",
    });
  }

  const rawToken = generateRawToken();
  admin.passwordResetTokenHash = hashRawToken(rawToken);
  admin.passwordResetExpires = Date.now() + 30 * 60 * 1000;
  await admin.save();

  await queueEmail({
    to: admin.email,
    subject: "Reset your password",
    template: EMAIL_TEMPLATES.PASSWORD_RESET,
    variables: {
      name: admin.name,
      resetUrl: `${process.env.CLIENT_URL}/1dama3na/reset-password.html?token=${rawToken}`,
    },
  });

  sendSuccess(res, {
    message: "If that email exists, a reset link has been sent",
  });
});

// @desc    Reset password using token from email
// @route   POST /api/v1/auth/reset-password
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const tokenHash = hashRawToken(token);

  const admin = await Admin.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpires: { $gt: Date.now() },
  }).select("+passwordResetTokenHash +passwordResetExpires");

  if (!admin)
    throw ApiError.badRequest("Password reset token is invalid or has expired");

  admin.password = password;
  admin.passwordResetTokenHash = null;
  admin.passwordResetExpires = null;
  admin.tokenVersion += 1; // invalidate existing sessions
  await admin.save();

  await logActivity({
    actor: admin,
    action: ACTIVITY_ACTIONS.PASSWORD_RESET,
    description: `${admin.name} reset their password`,
    req,
  });

  sendSuccess(res, {
    message: "Password reset successful. Please log in with your new password.",
  });
});

// @desc    Change password while logged in
// @route   POST /api/v1/auth/change-password
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const admin = await Admin.findById(req.admin._id).select("+password");

  if (!(await admin.comparePassword(currentPassword))) {
    throw ApiError.badRequest("Current password is incorrect");
  }

  admin.password = newPassword;
  admin.tokenVersion += 1;
  await admin.save();

  await logActivity({
    actor: admin,
    action: ACTIVITY_ACTIONS.PASSWORD_RESET,
    description: `${admin.name} changed their password`,
    req,
  });

  sendSuccess(res, {
    message: "Password updated successfully. Please log in again.",
  });
});

// @desc    Get the currently authenticated admin
// @route   GET /api/v1/auth/me
export const getMe = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: { admin: req.admin.toSafeObject() } });
});

