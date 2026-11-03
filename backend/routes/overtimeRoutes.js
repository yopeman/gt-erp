import express from 'express';
import {
  createOvertime,
  getOvertimes,
  getOvertimeById,
  updateOvertime,
  reviewOvertime,
  updateOvertimePaymentStatus,
  deleteOvertime,
  getMyOvertimes
} from '../controllers/overtimeController.js';
import { protect } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect);

// Employee Self-Service
router.get('/my-overtimes', getMyOvertimes);
router.post('/', createOvertime);

// Review & Approval Routes
router.patch('/:id/review', authorizeRoles('admin', 'hr', 'manager'), reviewOvertime);
router.patch('/:id/payment-status', authorizeRoles('admin', 'hr'), updateOvertimePaymentStatus);

// Management Routes
router.get('/', getOvertimes);
router.get('/:id', getOvertimeById);
router.put('/:id', authorizeRoles('admin', 'hr', 'manager'), updateOvertime);
router.delete('/:id', authorizeRoles('admin', 'hr'), deleteOvertime);

export default router;
