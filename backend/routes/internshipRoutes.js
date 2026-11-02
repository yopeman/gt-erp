import express from 'express';
import {
  createInternship,
  getInternships,
  getInternshipById,
  updateInternship,
  deleteInternship
} from '../controllers/internshipController.js';
import { protect } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getInternships)
  .post(authorizeRoles('admin', 'hr'), createInternship);

router
  .route('/:id')
  .get(getInternshipById)
  .put(authorizeRoles('admin', 'hr'), updateInternship)
  .delete(authorizeRoles('admin', 'hr'), deleteInternship);

export default router;

