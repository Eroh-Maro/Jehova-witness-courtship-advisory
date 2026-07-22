import { Router } from 'express';
import * as dashboardController from '../controllers/dashboardController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);

router.get('/', dashboardController.getAnalytics);
router.get('/monthly-registrations', dashboardController.getMonthlyRegistrations);

export default router;
