import express from 'express';
import {
  createOvertime,
  getOvertimes,
  getOvertimeById,
  updateOvertime,
  reviewOvertime,
  updateOvertimePaymentStatus,
  deleteOvertime,
  lookupAttendanceForOvertime,
  getMyOvertimes
} from '../controllers/overtimeController.js';
import { protect } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect);

// Specific routes before parameterized :id
router.get('/my-overtimes', getMyOvertimes);
router.get('/attendance-lookup', lookupAttendanceForOvertime);

router
  .route('/')
  .get(getOvertimes)
  .post(createOvertime);

// Review & Approval Routes
router.patch('/:id/review', authorizeRoles('admin', 'hr', 'manager'), reviewOvertime);
router.patch('/:id/payment', authorizeRoles('admin', 'hr', 'finance'), updateOvertimePaymentStatus);
router.patch('/:id/payment-status', authorizeRoles('admin', 'hr', 'finance'), updateOvertimePaymentStatus);

// Management Routes
router.get('/:id', getOvertimeById);
router.put('/:id', authorizeRoles('admin', 'hr', 'manager'), updateOvertime);
router.delete('/:id', authorizeRoles('admin', 'hr'), deleteOvertime);

export default router;
