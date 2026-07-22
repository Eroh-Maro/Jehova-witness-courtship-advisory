import { Router } from 'express';
import * as profileController from '../controllers/profileController.js';
import { protect, optionalAuth } from '../middleware/auth.js';
import { authorize, permissionGate } from '../middleware/rbac.js';
import { singleImage, handleUploadErrors } from '../middleware/upload.js';
import validate from '../middleware/validate.js';
import { ROLES } from '../config/constants.js';
import {
  createProfileValidator,
  updateProfileValidator,
  profileIdValidator,
  changeStatusValidator,
  searchProfileValidator,
  assignProfileValidator,
} from '../validators/profileValidators.js';

const router = Router();

// Public profile submission
router.post(
  '/',
  optionalAuth,
  singleImage('profileImage'),
  handleUploadErrors,
  createProfileValidator,
  validate,
  profileController.createProfile
);

// Profile listing
router.get(
  '/',
  protect,
  searchProfileValidator,
  validate,
  profileController.searchProfiles
);

// Must remain before /:id
router.get(
  '/my-assigned',
  protect,
  profileController.getAssignedProfiles
);

// Assignment workflow
router.patch(
  '/:id/assign',
  protect,
  authorize(ROLES.SUPER_ADMIN),
  profileIdValidator,
  assignProfileValidator,
  validate,
  profileController.assignProfileToAdmin
);

router.patch(
  '/:id/claim',
  protect,
  profileIdValidator,
  validate,
  profileController.claimAssignedProfile
);

router.patch(
  '/:id/complete-assignment',
  protect,
  profileIdValidator,
  validate,
  profileController.completeAssignedProfile
);

// Profile-specific actions
router.get(
  '/:id/suggestions',
  protect,
  profileIdValidator,
  validate,
  profileController.getMatchSuggestions
);

router.post(
  '/:id/image',
  protect,
  profileIdValidator,
  validate,
  singleImage('profileImage'),
  handleUploadErrors,
  profileController.uploadProfileImage
);

router.patch(
  '/:id/approve',
  protect,
  permissionGate('permissions.coordinatorsCanApproveProfiles'),
  changeStatusValidator,
  validate,
  profileController.approveProfile
);

router.patch(
  '/:id/reject',
  protect,
  permissionGate('permissions.coordinatorsCanApproveProfiles'),
  changeStatusValidator,
  validate,
  profileController.rejectProfile
);

router.patch(
  '/:id/suspend',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  changeStatusValidator,
  validate,
  profileController.suspendProfile
);

router.patch(
  '/:id/reactivate',
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  profileIdValidator,
  validate,
  profileController.reactivateProfile
);

// Generic ID routes
router.get(
  '/:id',
  protect,
  profileIdValidator,
  validate,
  profileController.getProfile
);

router.patch(
  '/:id',
  protect,
  updateProfileValidator,
  validate,
  profileController.updateProfile
);

router.delete(
  '/:id',
  protect,
  permissionGate('permissions.coordinatorsCanDeleteProfiles'),
  profileIdValidator,
  validate,
  profileController.deleteProfile
);

export default router;