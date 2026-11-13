import express from 'express';
import {
  streamMessages,
  getConversations,
  getMessagesWithUser,
  sendMessage,
  markMessagesAsRead,
  getAvailableUsers
} from '../controllers/messageController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// SSE real-time stream
router.get('/realtime', streamMessages);

// List directory of users to chat with
router.get('/users', getAvailableUsers);

// Active conversation list
router.get('/conversations', getConversations);

// Send a direct message
router.post('/', sendMessage);

// Thread messages with a specific user
router.get('/user/:userId', getMessagesWithUser);

// Mark thread as read
router.patch('/user/:userId/read', markMessagesAsRead);

export default router;

