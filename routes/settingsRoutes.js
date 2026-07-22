import { Router } from 'express';
import * as settingsController from '../controllers/settingsController.js';
import { protect } from '../middleware/auth.js';
import { isSuperAdmin } from '../middleware/rbac.js';
import validate from '../middleware/validate.js';
import { updateSettingsValidator } from '../validators/settingsValidators.js';

const router = Router();

router.get('/', protect, settingsController.getPlatformSettings);
router.patch('/', protect, isSuperAdmin, updateSettingsValidator, validate, settingsController.updatePlatformSettings);

export default router;
