import express from 'express';
import {
  createUser,
  loginUser,
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

// Protected user routes
router.get('/me', protect, getMe);
router.get('/', protect, authorizeRoles('admin', 'hr'), getUsers);
router.post('/', protect, authorizeRoles('admin'), createUser);
router.get('/:id', protect, authorizeRoles('admin', 'hr'), getUserById);
router.put('/:id', protect, authorizeRoles('admin'), updateUser);
router.delete('/:id', protect, authorizeRoles('admin'), deleteUser);

export default router;

