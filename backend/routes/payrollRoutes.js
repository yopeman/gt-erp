import express from 'express';
import {
  createPayroll,
  generateMonthlyPayroll,
  getMyPayslips,
  getPayrolls,
  getPayrollById,
  updatePayroll,
  approvePayroll,
  markPayrollAsPaid,
  deletePayroll
} from '../controllers/payrollController.js';
import { protect } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect);

// Employee Self-Service
router.get('/my-payslips', getMyPayslips);

// Payroll Generation & Bulk operations
router.post('/generate-monthly', authorizeRoles('admin', 'hr'), generateMonthlyPayroll);

// Workflow Status Updates
router.patch('/:id/approve', authorizeRoles('admin', 'hr', 'manager'), approvePayroll);
router.patch('/:id/mark-paid', authorizeRoles('admin', 'hr'), markPayrollAsPaid);

// CRUD routes
router
  .route('/')
  .get(getPayrolls)
  .post(authorizeRoles('admin', 'hr'), createPayroll);

router
  .route('/:id')
  .get(getPayrollById)
  .put(authorizeRoles('admin', 'hr'), updatePayroll)
  .delete(authorizeRoles('admin', 'hr'), deletePayroll);

export default router;
