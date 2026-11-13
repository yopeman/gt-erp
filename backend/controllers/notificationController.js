import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendNotificationToUser } from '../utils/notificationService.js';
import { registerNotificationStream } from '../utils/realtimeService.js';

// Real-time SSE stream for current user notifications
export const streamNotifications = (req, res) => {
  registerNotificationStream(req.user._id, req, res);
};

// Get current user's notifications with read/unread filtering
export const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      page = 1,
      limit = 30,
      unreadOnly,
      readOnly,
      filter,
      status,
      type,
      search
    } = req.query;

    const query = { user: userId };

    // Filtering read / unread
    if (filter === 'unread' || status === 'unread' || unreadOnly === 'true') {
      query.isRead = false;
    } else if (filter === 'read' || status === 'read' || readOnly === 'true') {
      query.isRead = true;
    }

    // Type filtering
    if (type && type !== 'all') {
      query.type = type;
    }

    // Keyword search in title & body
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ title: searchRegex }, { body: searchRegex }];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ user: userId, isRead: false });
    const readCount = await Notification.countDocuments({ user: userId, isRead: true });
    const allCount = await Notification.countDocuments({ user: userId });

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      unreadCount,
      readCount,
      allCount,
      data: notifications,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
};

// Mark a single notification as read
export const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });
    const readCount = await Notification.countDocuments({ user: req.user._id, isRead: true });

    res.status(200).json({
      success: true,
      unreadCount,
      readCount,
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
};

// Mark a single notification as unread
export const markNotificationUnread = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { isRead: false, readAt: null } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });
    const readCount = await Notification.countDocuments({ user: req.user._id, isRead: true });

    res.status(200).json({
      success: true,
      unreadCount,
      readCount,
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as unread',
      error: error.message
    });
  }
};

// Mark all user notifications as read
export const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.status(200).json({
      success: true,
      unreadCount: 0,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read',
      error: error.message
    });
  }
};

// Delete a notification
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });

    res.status(200).json({
      success: true,
      unreadCount,
      message: 'Notification removed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
};

// Register / Save FCM device token for current user
export const registerFcmToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'A valid FCM token string is required'
      });
    }

    const trimmedToken = token.trim();
    if (!trimmedToken) {
      return res.status(400).json({
        success: false,
        message: 'Token cannot be empty'
      });
    }

    // Add token if not already in array
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { fcmTokens: trimmedToken } },
      { new: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'FCM device token registered successfully for push notifications',
      activeTokensCount: user.fcmTokens?.length || 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to register FCM device token',
      error: error.message
    });
  }
};

// Deregister / Remove FCM device token on logout
export const removeFcmToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { fcmTokens: token.trim() }
    });

    res.status(200).json({
      success: true,
      message: 'FCM device token removed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to remove FCM device token',
      error: error.message
    });
  }
};

// Send a test notification to logged-in user
export const sendTestNotification = async (req, res) => {
  try {
    const { title = 'GT-ERP Test Notification', body = 'Firebase Push Notification is working perfectly!' } = req.body;

    const notif = await sendNotificationToUser({
      userId: req.user._id,
      title,
      body,
      type: 'general',
      data: {
        timestamp: new Date().toISOString(),
        test: true
      }
    });

    res.status(200).json({
      success: true,
      message: 'Test notification sent successfully',
      data: notif
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification',
      error: error.message
    });
  }
};

