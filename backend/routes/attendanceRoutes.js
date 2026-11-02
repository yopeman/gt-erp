import express from 'express';
import {
  clockIn,
  clockOut,
  recordAttendance,
  getAttendances,
  getAttendanceById,
  updateAttendance,
  deleteAttendance
} from '../controllers/attendanceController.js';
import { protect, optionalAuth } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';

const router = express.Router();

// Self Clock-In and Clock-Out routes (supports selfie capture)
router.post('/clock-in', optionalAuth, clockIn);
router.post('/clock-out', optionalAuth, clockOut);

// Standard Attendance Management routes
router.use(protect);

router
  .route('/')
  .get(getAttendances)
  .post(authorizeRoles('admin', 'hr', 'manager'), recordAttendance);

router
  .route('/:id')
  .get(getAttendanceById)
  .put(authorizeRoles('admin', 'hr', 'manager'), updateAttendance)
  .delete(authorizeRoles('admin', 'hr'), deleteAttendance);

export default router;

