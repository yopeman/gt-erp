import express from 'express';
import {
  createPayroll,
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

router
  .route('/')
  .get(getPayrolls)
  .post(authorizeRoles('admin', 'hr', 'finance'), createPayroll);

router
  .route('/:id')
  .get(getPayrollById)
  .put(authorizeRoles('admin', 'hr', 'finance'), updatePayroll)
  .delete(authorizeRoles('admin', 'hr', 'finance'), deletePayroll);

router.patch('/:id/approve', authorizeRoles('admin', 'hr', 'finance'), approvePayroll);
router.patch('/:id/pay', authorizeRoles('admin', 'finance'), markPayrollAsPaid);

export default router;

