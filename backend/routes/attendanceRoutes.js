import express from 'express';
import {
  clockIn,
  clockOut,
  recordAttendance,
  getAttendances,
  getAttendanceById,
  updateAttendance,
  deleteAttendance,
  getMyTodayAttendance,
  getMyAttendanceHistory,
  getAttendanceStats
} from '../controllers/attendanceController.js';
import { protect } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';

const router = express.Router();

// All attendance operations require authentication
router.use(protect);

// Employee Self-Service Attendance
router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);
router.get('/today', getMyTodayAttendance);
router.get('/my-history', getMyAttendanceHistory);

// Management / HR Analytics
router.get('/stats', authorizeRoles('admin', 'hr', 'manager'), getAttendanceStats);

// General Attendance Management routes
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
