import express from 'express';
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  registerFcmToken,
  removeFcmToken,
  sendTestNotification
} from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getMyNotifications);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:id/read', markNotificationRead);
router.delete('/:id', deleteNotification);

// FCM Token Management
router.post('/fcm-token', registerFcmToken);
router.delete('/fcm-token', removeFcmToken);

// Real-time Push Test
router.post('/test', sendTestNotification);

export default router;

