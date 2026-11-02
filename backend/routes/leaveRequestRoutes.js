import express from 'express';
import {
  createLeaveRequest,
  getLeaveRequests,
  getLeaveRequestById,
  updateLeaveRequest,
  decideLeaveRequest,
  deleteLeaveRequest
} from '../controllers/leaveRequestController.js';
import { protect } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getLeaveRequests)
  .post(createLeaveRequest);

router
  .route('/:id')
  .get(getLeaveRequestById)
  .put(updateLeaveRequest)
  .delete(deleteLeaveRequest);

router.patch('/:id/decision', authorizeRoles('admin', 'hr', 'manager'), decideLeaveRequest);

export default router;

