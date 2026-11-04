import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Employee from '../models/Employee.js';

/**
 * Send in-app notification and FCM push notification to a specific employee
 */
export const sendNotificationToEmployee = async ({
  employeeId,
  title,
  body,
  type = 'general',
  data = {}
}) => {
  try {
    if (!employeeId || !title || !body) return null;

    const employee = await Employee.findById(employeeId);
    let userId = employee?.user;
    if (!userId && employee?.email) {
      const user = await User.findOne({ email: employee.email.toLowerCase() });
      userId = user?._id;
    }

    if (userId) {
      return await sendNotificationToUser({
        userId,
        title,
        body,
        type,
        data
      });
    }
    return null;
  } catch (err) {
    console.warn('sendNotificationToEmployee error:', err.message);
    return null;
  }
};

/**
 * Send in-app notification and FCM push notification to a specific user
 */
export const sendNotificationToUser = async ({
  userId,
  title,
  body,
  type = 'general',
  data = {}
}) => {
  try {
    if (!userId || !title || !body) return null;

    // 1. Create in-app Notification record in MongoDB
    const notification = await Notification.create({
      user: userId,
      title,
      body,
      type,
      data
    });

    // 2. Lookup user and their active FCM tokens
    const user = await User.findById(userId);
    if (!user || !Array.isArray(user.fcmTokens) || user.fcmTokens.length === 0) {
      return notification;
    }

    // 3. Attempt FCM push dispatch if tokens exist
    await dispatchFcmMessage({
      tokens: user.fcmTokens,
      title,
      body,
      data: {
        ...data,
        notificationId: String(notification._id),
        type
      },
      userId
    });

    return notification;
  } catch (err) {
    console.warn('sendNotificationToUser error:', err.message);
    return null;
  }
};

/**
 * Send notification to all users having any of the specified roles (e.g., ['admin', 'hr'])
 */
export const sendNotificationToRoles = async ({
  roles = ['admin', 'hr'],
  title,
  body,
  type = 'general',
  data = {}
}) => {
  try {
    const roleList = Array.isArray(roles) ? roles : [roles];
    const users = await User.find({
      roles: { $in: roleList },
      isDeleted: false
    }).select('_id fcmTokens');

    if (!users || users.length === 0) return [];

    const createdNotifications = [];
    for (const u of users) {
      const notif = await sendNotificationToUser({
        userId: u._id,
        title,
        body,
        type,
        data
      });
      if (notif) createdNotifications.push(notif);
    }

    return createdNotifications;
  } catch (err) {
    console.warn('sendNotificationToRoles error:', err.message);
    return [];
  }
};

/**
 * Dispatch Firebase Cloud Messaging payload to tokens
 */
export const dispatchFcmMessage = async ({ tokens, title, body, data = {}, userId = null }) => {
  if (!tokens || tokens.length === 0) return { success: false, reason: 'No tokens provided' };

  const serverKey = process.env.FIREBASE_SERVER_KEY || process.env.FCM_SERVER_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  // If serverKey is configured, send using FCM API
  if (serverKey) {
    try {
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${serverKey}`
        },
        body: JSON.stringify({
          registration_ids: tokens,
          notification: {
            title,
            body,
            icon: '/vite.svg',
            click_action: data.link || '/'
          },
          data: {
            ...data,
            title,
            body
          }
        })
      });

      const resJson = await response.json();

      // Clean up invalid or expired tokens
      if (resJson && Array.isArray(resJson.results) && userId) {
        const invalidTokens = [];
        resJson.results.forEach((r, idx) => {
          if (r.error === 'NotRegistered' || r.error === 'InvalidRegistration') {
            invalidTokens.push(tokens[idx]);
          }
        });

        if (invalidTokens.length > 0) {
          await User.findByIdAndUpdate(userId, {
            $pull: { fcmTokens: { $in: invalidTokens } }
          });
        }
      }

      return { success: true, result: resJson };
    } catch (pushErr) {
      console.warn('FCM dispatch error:', pushErr.message);
      return { success: false, error: pushErr.message };
    }
  }

  // If serverKey is not configured yet, log dispatch ready with project configuration
  return {
    success: true,
    simulated: true,
    message: `FCM tokens registered (${tokens.length} device(s)) for Project: ${projectId || 'Configured'}`
  };
};

export default {
  sendNotificationToUser,
  sendNotificationToEmployee,
  sendNotificationToRoles,
  dispatchFcmMessage
};

