import express from 'express';
import {
  createLeaveBalance,
  initializeEmployeeYearlyBalances,
  getMyLeaveBalances,
  getLeaveBalances,
  getLeaveBalanceById,
  updateLeaveBalance,
  deleteLeaveBalance
} from '../controllers/leaveBalanceController.js';
import { protect } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect);

// Employee Self-Service
router.get('/my-balances', getMyLeaveBalances);

// Admin / HR Management Routes
router.post('/initialize', authorizeRoles('admin', 'hr'), initializeEmployeeYearlyBalances);

router
  .route('/')
  .get(getLeaveBalances)
  .post(authorizeRoles('admin', 'hr'), createLeaveBalance);

router
  .route('/:id')
  .get(getLeaveBalanceById)
  .put(authorizeRoles('admin', 'hr'), updateLeaveBalance)
  .delete(authorizeRoles('admin', 'hr'), deleteLeaveBalance);

export default router;
