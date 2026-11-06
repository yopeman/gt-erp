import express from 'express';
import {
  createEmployee,
  getMyProfile,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  linkUserAccount,
  addDocument,
  addEducation,
  getPublicEmployeeCard
} from '../controllers/employeeController.js';
import { protect } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';

const router = express.Router();

// Public employee verification endpoint (accessible via QR code without authentication)
router.get('/verify/:identifier', getPublicEmployeeCard);

router.use(protect);

// Current employee profile
router.get('/me', getMyProfile);

// Admin / HR Employee Management
router.post('/:id/link-user', authorizeRoles('admin', 'hr'), linkUserAccount);

router
  .route('/')
  .get(getEmployees)
  .post(authorizeRoles('admin', 'hr'), createEmployee);

router
  .route('/:id')
  .get(getEmployeeById)
  .put(authorizeRoles('admin', 'hr'), updateEmployee)
  .delete(authorizeRoles('admin', 'hr'), deleteEmployee);

router.post('/:id/documents', authorizeRoles('admin', 'hr', 'employee'), addDocument);
router.post('/:id/educations', authorizeRoles('admin', 'hr'), addEducation);

export default router;
