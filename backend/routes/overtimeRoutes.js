import express from 'express';
import {
  createOvertime,
  getOvertimes,
  getOvertimeById,
  updateOvertime,
  reviewOvertime,
  updateOvertimePaymentStatus,
  deleteOvertime
} from '../controllers/overtimeController.js';
import { protect } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getOvertimes)
  .post(createOvertime);

router
  .route('/:id')
  .get(getOvertimeById)
  .put(updateOvertime)
  .delete(deleteOvertime);

router.patch('/:id/review', authorizeRoles('admin', 'hr', 'manager'), reviewOvertime);
router.patch('/:id/payment', authorizeRoles('admin', 'hr', 'finance'), updateOvertimePaymentStatus);

export default router;

