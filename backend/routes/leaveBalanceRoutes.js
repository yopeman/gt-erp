import express from 'express';
import {
  createLeaveBalance,
  getLeaveBalances,
  getLeaveBalanceById,
  updateLeaveBalance,
  adjustLeaveDays,
  deleteLeaveBalance
} from '../controllers/leaveBalanceController.js';
import { protect } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getLeaveBalances)
  .post(authorizeRoles('admin', 'hr'), createLeaveBalance);

router
  .route('/:id')
  .get(getLeaveBalanceById)
  .put(authorizeRoles('admin', 'hr'), updateLeaveBalance)
  .delete(authorizeRoles('admin', 'hr'), deleteLeaveBalance);

router.patch('/:id/adjust', authorizeRoles('admin', 'hr'), adjustLeaveDays);

export default router;

