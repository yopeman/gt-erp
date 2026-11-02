import express from 'express';
import userRoutes from './userRoutes.js';
import employeeRoutes from './employeeRoutes.js';
import leaveRequestRoutes from './leaveRequestRoutes.js';
import attendanceRoutes from './attendanceRoutes.js';
import overtimeRoutes from './overtimeRoutes.js';
import payrollRoutes from './payrollRoutes.js';
import jobPositionRoutes from './jobPositionRoutes.js';
import jobApplicationRoutes from './jobApplicationRoutes.js';
import internshipRoutes from './internshipRoutes.js';
import clearanceRoutes from './clearanceRoutes.js';
import leaveBalanceRoutes from './leaveBalanceRoutes.js';

const router = express.Router();

router.use('/users', userRoutes);
router.use('/employees', employeeRoutes);
router.use('/leave-requests', leaveRequestRoutes);
router.use('/attendances', attendanceRoutes);
router.use('/overtimes', overtimeRoutes);
router.use('/payrolls', payrollRoutes);
router.use('/job-positions', jobPositionRoutes);
router.use('/job-applications', jobApplicationRoutes);
router.use('/internships', internshipRoutes);
router.use('/clearances', clearanceRoutes);
router.use('/leave-balances', leaveBalanceRoutes);

export default router;

