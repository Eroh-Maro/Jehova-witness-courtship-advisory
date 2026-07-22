import { Router } from 'express';
import * as reportController from '../controllers/reportController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { reportLimiter } from '../middleware/rateLimiter.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.get('/:type', protect, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), reportLimiter, reportController.exportReport);

export default router;
