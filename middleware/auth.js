import Admin from '../models/Admin.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { verifyAccessToken } from '../utils/token.js';

const getAccessToken = (req) => {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  return req.cookies?.accessToken || null;
};

const authenticateAdmin = async (token) => {
  if (!token) {
    throw ApiError.unauthorized('Authentication token missing');
  }

  let decoded;

  try {
    decoded = verifyAccessToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  const admin = await Admin.findById(decoded.id);

  if (!admin || !admin.isActive) {
    throw ApiError.unauthorized('Account not found or deactivated');
  }

  if (admin.tokenVersion !== decoded.tokenVersion) {
    throw ApiError.unauthorized(
      'Session has been invalidated, please log in again'
    );
  }

  return admin;
};

export const protect = asyncHandler(async (req, res, next) => {
  const token = getAccessToken(req);
  req.admin = await authenticateAdmin(token);
  next();
});

// Attaches the admin when a valid token exists, but never blocks the request.
export const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = getAccessToken(req);

  if (!token) {
    return next();
  }

  try {
    req.admin = await authenticateAdmin(token);
  } catch {
    // Optional authentication intentionally ignores invalid sessions.
  }

  next();
});