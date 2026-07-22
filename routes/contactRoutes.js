import { Router } from 'express';
import * as contactController from '../controllers/contactController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { contactFormLimiter } from '../middleware/rateLimiter.js';
import validate from '../middleware/validate.js';
import { ROLES } from '../config/constants.js';
import {
  createContactValidator,
  replyContactValidator,
  updateContactStatusValidator,
  contactIdValidator,
} from '../validators/contactValidators.js';

const router = Router();

router.post('/', contactFormLimiter, createContactValidator, validate, contactController.createContact);

router.get('/', protect, contactController.listContacts);
router.get('/:id', protect, contactIdValidator, validate, contactController.getContact);
router.post('/:id/reply', protect, replyContactValidator, validate, contactController.replyContact);
router.patch('/:id', protect, updateContactStatusValidator, validate, contactController.updateContactStatus);
router.delete('/:id', protect, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), contactIdValidator, validate, contactController.deleteContact);

export default router;
