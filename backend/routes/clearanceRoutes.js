import express from 'express';
import {
  createClearance,
  getMyClearance,
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

// Employee Self-Service
router.get('/my-clearance', getMyClearance);

// Checklist items & Final approval
router.patch('/:id/checklist/:itemId', authorizeRoles('admin', 'hr', 'manager'), updateChecklistItem);
router.patch('/:id/final-approve', authorizeRoles('admin', 'hr'), finalApproveClearance);

// Clearance CRUD
router
  .route('/')
  .get(getClearances)
  .post(createClearance);

router
  .route('/:id')
  .get(getClearanceById)
  .put(authorizeRoles('admin', 'hr', 'manager'), updateClearance)
  .delete(authorizeRoles('admin', 'hr'), deleteClearance);

export default router;
