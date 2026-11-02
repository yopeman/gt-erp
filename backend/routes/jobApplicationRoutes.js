import express from 'express';
import {
  createJobApplication,
  getJobApplications,
  getJobApplicationById,
  updateJobApplication,
  scheduleInterview,
  updateApplicationStatus,
  deleteJobApplication
} from '../controllers/jobApplicationController.js';
import { protect } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';

const router = express.Router();

// Candidates can submit job applications
router.post('/', createJobApplication);

// HR / Admin routes
router.use(protect);
router.use(authorizeRoles('admin', 'hr'));

router.get('/', getJobApplications);
router.get('/:id', getJobApplicationById);
router.put('/:id', updateJobApplication);
router.patch('/:id/interview', scheduleInterview);
router.patch('/:id/status', updateApplicationStatus);
router.delete('/:id', deleteJobApplication);

export default router;

