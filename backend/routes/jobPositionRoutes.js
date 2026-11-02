import express from 'express';
import {
  createJobPosition,
  getJobPositions,
  getJobPositionById,
  updateJobPosition,
  deleteJobPosition
} from '../controllers/jobPositionController.js';
import { protect, optionalAuth } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';

const router = express.Router();

// Public can view open job listings
router.get('/', optionalAuth, getJobPositions);
router.get('/:id', optionalAuth, getJobPositionById);

// Admin / HR can create, update, delete
router.post('/', protect, authorizeRoles('admin', 'hr'), createJobPosition);
router.put('/:id', protect, authorizeRoles('admin', 'hr'), updateJobPosition);
router.delete('/:id', protect, authorizeRoles('admin', 'hr'), deleteJobPosition);

export default router;

