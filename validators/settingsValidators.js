import { body } from 'express-validator';

export const updateSettingsValidator = [
  body('platformName').optional().trim().isLength({ min: 2, max: 150 }),
  body('supportEmail').optional().isEmail(),
  body('maintenanceMode.enabled').optional().isBoolean(),
  body('matchRules.minAge').optional().isInt({ min: 16, max: 100 }),
  body('matchRules.maxAgeGapYears').optional().isInt({ min: 0, max: 60 }),
  body('security.sessionTimeoutMinutes').optional().isInt({ min: 5, max: 1440 }),
  body('security.maxLoginAttempts').optional().isInt({ min: 3, max: 20 }),
  body('backup.frequency').optional().isIn(['daily', 'weekly', 'monthly']),
];
