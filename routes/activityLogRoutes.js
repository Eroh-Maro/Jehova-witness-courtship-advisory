import { Router } from 'express';
import * as activityLogController from '../controllers/activityLogController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.get('/', protect, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), activityLogController.listActivityLogs);

export default router;
