import { body, param, query } from 'express-validator';
import {
  ASSIGNMENT_STATUS,
  GENDER,
  MARITAL_STATUS,
  PROFILE_STATUS,
} from '../config/constants.js';

export const createProfileValidator = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage('First name is required (2-60 chars)'),

  body('lastName')
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage('Last name is required (2-60 chars)'),

  body('email')
    .isEmail()
    .withMessage('A valid email is required')
    .normalizeEmail(),

  body('phone')
    .trim()
    .isLength({ min: 6, max: 30 })
    .withMessage('A valid phone number is required'),

  body('dateOfBirth')
    .isISO8601()
    .withMessage('A valid date of birth is required')
    .toDate(),

  body('gender')
    .isIn(Object.values(GENDER))
    .withMessage('Gender must be male or female'),

  body('maritalStatus')
    .isIn(Object.values(MARITAL_STATUS))
    .withMessage('Invalid marital status'),

  body('country')
    .trim()
    .notEmpty()
    .withMessage('Country is required')
    .isLength({ min: 2, max: 2 })
    .withMessage('Country must be a 2-letter ISO code')
    .toUpperCase(),

  body('congregation')
    .trim()
    .notEmpty()
    .withMessage('Congregation is required'),

  body('aboutMe')
    .optional()
    .isLength({ max: 3000 })
    .withMessage('About me cannot exceed 3000 characters'),

  body('lookingFor')
    .optional()
    .isLength({ max: 3000 })
    .withMessage('Looking for cannot exceed 3000 characters'),

  body('qualities')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Qualities must be an array containing at most 20 items'),
];

export const updateProfileValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid profile id'),

  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage('First name must be between 2 and 60 characters'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage('Last name must be between 2 and 60 characters'),

  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),

  body('phone')
    .optional()
    .trim()
    .isLength({ min: 6, max: 30 })
    .withMessage('Phone must be between 6 and 30 characters'),

  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Invalid date of birth')
    .toDate(),

  body('gender')
    .optional()
    .isIn(Object.values(GENDER))
    .withMessage('Invalid gender'),

  body('maritalStatus')
    .optional()
    .isIn(Object.values(MARITAL_STATUS))
    .withMessage('Invalid marital status'),

  body('country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 2 })
    .withMessage('Country must be a 2-letter ISO code')
    .toUpperCase(),

  body('aboutMe')
    .optional()
    .isLength({ max: 3000 })
    .withMessage('About me cannot exceed 3000 characters'),

  body('lookingFor')
    .optional()
    .isLength({ max: 3000 })
    .withMessage('Looking for cannot exceed 3000 characters'),

  body('qualities')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Qualities must be an array containing at most 20 items'),
];

export const profileIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid profile id'),
];

/*
 * Used by approve, reject, suspend, and similar routes.
 * The controller determines the new status, so body.status must not be required.
 */
export const changeStatusValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid profile id'),

  body('note')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Note cannot exceed 500 characters'),
];

export const assignProfileValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid profile id'),

  body('adminId')
    .notEmpty()
    .withMessage('adminId is required')
    .bail()
    .isMongoId()
    .withMessage('Invalid admin id'),
];

export const searchProfileValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be at least 1')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),

  query('gender')
    .optional()
    .isIn(Object.values(GENDER))
    .withMessage('Invalid gender'),

  query('status')
    .optional()
    .isIn(Object.values(PROFILE_STATUS))
    .withMessage('Invalid profile status'),

  query('assignmentStatus')
    .optional()
    .isIn(Object.values(ASSIGNMENT_STATUS))
    .withMessage('Invalid assignment status'),

  query('assignedAdmin')
    .optional()
    .isMongoId()
    .withMessage('Invalid assigned admin id'),

  query('country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 2 })
    .withMessage('Country must be a 2-letter ISO code')
    .toUpperCase(),

  query('minAge')
    .optional()
    .isInt({ min: 18, max: 120 })
    .withMessage('Minimum age must be between 18 and 120')
    .toInt(),

  query('maxAge')
    .optional()
    .isInt({ min: 18, max: 120 })
    .withMessage('Maximum age must be between 18 and 120')
    .toInt(),

  query('q')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query cannot exceed 100 characters'),

  query('sort')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Sort value is too long'),
];