import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { protect } from '../middleware/auth.js';
import { isSuperAdmin } from '../middleware/rbac.js';

const router = Router();

router.use(protect, isSuperAdmin);

router.get('/', adminController.listAdmins);
router.patch('/:id', adminController.updateAdmin);

router.patch(
  '/:id/countries',
  adminController.assignAdminCountries
);

router.delete('/:id', adminController.deleteAdmin);

export default router;