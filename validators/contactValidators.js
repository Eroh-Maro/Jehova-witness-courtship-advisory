import { body, param } from 'express-validator';
import { CONTACT_STATUS } from '../config/constants.js';

export const createContactValidator = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name is required'),
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('phone').optional().trim().isLength({ max: 30 }),
  body('subject').optional().trim().isLength({ max: 200 }),
  body('message').trim().isLength({ min: 5, max: 5000 }).withMessage('Message is required'),
];

export const replyContactValidator = [
  param('id').isMongoId().withMessage('Invalid contact id'),
  body('message').trim().isLength({ min: 2, max: 5000 }).withMessage('Reply message is required'),
];

export const updateContactStatusValidator = [
  param('id').isMongoId().withMessage('Invalid contact id'),
  body('status').isIn(Object.values(CONTACT_STATUS)).withMessage('Invalid status'),
];

export const contactIdValidator = [param('id').isMongoId().withMessage('Invalid contact id')];
