import { body, param } from 'express-validator';
import { MATCH_STATUS } from '../config/constants.js';

export const createMatchValidator = [
  body('profileA').isMongoId().withMessage('profileA must be a valid profile id'),
  body('profileB').isMongoId().withMessage('profileB must be a valid profile id'),
  body('note').optional().isLength({ max: 500 }),
];

export const matchIdValidator = [param('id').isMongoId().withMessage('Invalid match id')];

export const updateMatchStatusValidator = [
  param('id').isMongoId().withMessage('Invalid match id'),
  body('status').isIn(Object.values(MATCH_STATUS)).withMessage('Invalid match status'),
  body('note').optional().isLength({ max: 500 }),
];

export const addMatchNoteValidator = [
  param('id').isMongoId().withMessage('Invalid match id'),
  body('text').trim().isLength({ min: 1, max: 1000 }).withMessage('Note text is required'),
];
