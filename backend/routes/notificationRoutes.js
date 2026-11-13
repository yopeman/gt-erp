import express from 'express';
import {
  getMyNotifications,
  markNotificationRead,
  markNotificationUnread,
  markAllNotificationsRead,
  deleteNotification,
  registerFcmToken,
  removeFcmToken,
  sendTestNotification,
  streamNotifications
} from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// SSE real-time stream
router.get('/realtime', streamNotifications);

router.get('/', getMyNotifications);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:id/read', markNotificationRead);
router.patch('/:id/unread', markNotificationUnread);
router.delete('/:id', deleteNotification);

// FCM Token Management
router.post('/fcm-token', registerFcmToken);
router.delete('/fcm-token', removeFcmToken);

// Real-time Push Test
router.post('/test', sendTestNotification);

export default router;

