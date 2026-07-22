import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export const generateAccessToken = (admin) =>
  jwt.sign({ id: admin._id, role: admin.role, tokenVersion: admin.tokenVersion }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });

export const generateRefreshToken = (admin) =>
  jwt.sign({ id: admin._id, tokenVersion: admin.tokenVersion }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });

export const verifyAccessToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

export const verifyRefreshToken = (token) => jwt.verify(token, process.env.JWT_REFRESH_SECRET);

export const generateRawToken = () => crypto.randomBytes(32).toString('hex');

export const hashRawToken = (rawToken) => crypto.createHash('sha256').update(rawToken).digest('hex');

export const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000,
  signed: true,
});
