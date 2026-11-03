import express from 'express';
import {
  createEmployee,
  getMyProfile,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  addDocument,
  addEducation
} from '../controllers/employeeController.js';
import { protect } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect);

// Current employee profile
router.get('/me', getMyProfile);

// Employee CRUD
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
