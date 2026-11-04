import express from 'express';
import {
  createLeaveRequest,
  getLeaveRequests,
  getLeaveRequestById,
  updateLeaveRequest,
  managerReviewLeaveRequest,
  decideLeaveRequest,
  cancelMyLeaveRequest,
  deleteLeaveRequest,
  getMyLeaveRequests
} from '../controllers/leaveRequestController.js';
import { protect } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect);

// Employee Self-Service Leave Routes
router.get('/my-requests', getMyLeaveRequests);
router.post('/', createLeaveRequest);
router.post('/:id/cancel', cancelMyLeaveRequest);

// Manager & HR Review Routes
router.patch('/:id/manager-review', authorizeRoles('admin', 'hr', 'manager'), managerReviewLeaveRequest);
router.patch('/:id/decision', authorizeRoles('admin', 'hr'), decideLeaveRequest);
router.patch('/:id/decide', authorizeRoles('admin', 'hr'), decideLeaveRequest);

// Standard CRUD
router.get('/', getLeaveRequests);
router.get('/:id', getLeaveRequestById);
router.put('/:id', authorizeRoles('admin', 'hr', 'manager'), updateLeaveRequest);
router.delete('/:id', authorizeRoles('admin', 'hr'), deleteLeaveRequest);

export default router;
