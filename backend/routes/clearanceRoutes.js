import express from 'express';
import {
  createClearance,
  getClearances,
  getClearanceById,
  updateClearance,
  updateChecklistItem,
  finalApproveClearance,
  deleteClearance
} from '../controllers/clearanceController.js';
import { protect } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getClearances)
  .post(createClearance);

router
  .route('/:id')
  .get(getClearanceById)
  .put(updateClearance)
  .delete(authorizeRoles('admin', 'hr'), deleteClearance);

router.patch('/:id/checklist/:itemId', updateChecklistItem);
router.patch('/:id/final-approval', authorizeRoles('admin', 'hr'), finalApproveClearance);

export default router;

