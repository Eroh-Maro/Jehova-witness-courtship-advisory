import { Router } from 'express';
import * as matchController from '../controllers/matchController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import validate from '../middleware/validate.js';
import { ROLES } from '../config/constants.js';
import {
  createMatchValidator,
  matchIdValidator,
  updateMatchStatusValidator,
  addMatchNoteValidator,
} from '../validators/matchValidators.js';

const router = Router();

router.use(protect);

router.post('/', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), createMatchValidator, validate, matchController.createMatch);
router.get('/', matchController.listMatches);
router.get('/:id', matchIdValidator, validate, matchController.getMatch);
router.patch('/:id/status', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), updateMatchStatusValidator, validate, matchController.updateMatchStatus);
router.post('/:id/notes', addMatchNoteValidator, validate, matchController.addMatchNote);
router.delete('/:id', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), matchIdValidator, validate, matchController.deleteMatch);

export default router;
