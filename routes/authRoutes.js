import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { isSuperAdmin } from '../middleware/rbac.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import validate from '../middleware/validate.js';
import {
  loginValidator,
  registerAdminValidator,
  inviteAdminValidator,
  acceptInviteValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
} from '../validators/authValidators.js';
const router = Router();

router.post(
  '/register-first-admin',
  authLimiter,
  registerAdminValidator,
  validate,
  authController.registerFirstAdmin
);

router.post(
  '/login',
  authLimiter,
  loginValidator,
  validate,
  authController.login
);

router.post(
  '/logout',
  protect,
  authController.logout
);

router.post(
  '/refresh',
  authController.refresh
);

router.post(
  '/forgot-password',
  authLimiter,
  forgotPasswordValidator,
  validate,
  authController.forgotPassword
);

router.post(
  '/reset-password',
  authLimiter,
  resetPasswordValidator,
  validate,
  authController.resetPassword
);

router.post(
  '/change-password',
  protect,
  changePasswordValidator,
  validate,
  authController.changePassword
);

router.post(
  '/invite',
  protect,
  isSuperAdmin,
  inviteAdminValidator,
  validate,
  authController.inviteAdmin
);

// NEW: Accept invitation and activate account
router.post(
  '/accept-invite',
  authLimiter,
  acceptInviteValidator,
  validate,
  authController.acceptInvite
);

router.get(
  '/me',
  protect,
  authController.getMe
);



export default router;