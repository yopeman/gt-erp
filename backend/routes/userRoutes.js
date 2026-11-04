import express from 'express';
import {
  createUser,
  loginUser,
  changePassword,
  resetTemporaryPassword,
  getMe,
  getUsers,
  getUserById,
  updateUser,
  deleteUser
} from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';

const router = express.Router();

// Public auth routes
router.post('/register', createUser);
router.post('/login', loginUser);

// Authenticated user actions
router.post('/change-password', protect, changePassword);
router.get('/me', protect, getMe);

// Admin / HR User Management
router.post('/:id/reset-password', protect, authorizeRoles('admin', 'hr'), resetTemporaryPassword);
router.post('/:id/reset-temporary-password', protect, authorizeRoles('admin', 'hr'), resetTemporaryPassword);
router.get('/', protect, authorizeRoles('admin', 'hr'), getUsers);
router.post('/', protect, authorizeRoles('admin', 'hr'), createUser);
router.get('/:id', protect, authorizeRoles('admin', 'hr'), getUserById);
router.put('/:id', protect, authorizeRoles('admin'), updateUser);
router.delete('/:id', protect, authorizeRoles('admin'), deleteUser);

export default router;
