import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';
import { requestFcmToken, removeFcmTokenFromServer, onMessageListener } from '../config/firebase';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, token: authToken } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fcmToken, setFcmToken] = useState(() => localStorage.getItem('gt_erp_fcm_token') || null);
  const [permission, setPermission] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  // Active foreground toast notification popup
  const [activeToast, setActiveToast] = useState(null);

  // Fetch notifications from server
  const fetchNotifications = useCallback(async () => {
    if (!authToken || !user) return;
    setLoading(true);
    try {
      const response = await api.get('/notifications?limit=25');
      if (response.success && Array.isArray(response.data)) {
        setNotifications(response.data);
        setUnreadCount(response.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Could not fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [authToken, user]);

  // Request browser permission and obtain FCM token
  const requestPushPermission = async () => {
    try {
      const token = await requestFcmToken();
      if (token) {
        setFcmToken(token);
        localStorage.setItem('gt_erp_fcm_token', token);
        setPermission('granted');
        return token;
      }
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setPermission(Notification.permission);
      }
      return null;
    } catch (err) {
      console.warn('Notification permission request error:', err);
      return null;
    }
  };

  // Mark single notification as read
  const markAsRead = async (id) => {
    try {
      const response = await api.patch(`/notifications/${id}/read`);
      if (response.success) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.warn('Failed to mark notification as read:', err);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const response = await api.patch('/notifications/read-all');
      if (response.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.warn('Failed to mark all notifications as read:', err);
    }
  };

  // Delete notification
  const removeNotification = async (id) => {
    try {
      const response = await api.delete(`/notifications/${id}`);
      if (response.success) {
        setNotifications((prev) => prev.filter((n) => n._id !== id));
        if (response.unreadCount !== undefined) {
          setUnreadCount(response.unreadCount);
        }
      }
    } catch (err) {
      console.warn('Failed to delete notification:', err);
    }
  };

  // Send test push notification
  const sendTestNotification = async () => {
    try {
      const response = await api.post('/notifications/test', {
        title: 'GT-ERP Firebase Test',
        body: 'Push notification system connected and active!'
      });
      if (response.success) {
        await fetchNotifications();
        return true;
      }
    } catch (err) {
      console.warn('Test notification dispatch failed:', err);
      throw err;
    }
  };

  // Auto-fetch notifications on session change
  useEffect(() => {
    if (authToken && user) {
      fetchNotifications();

      // If permission is already granted, refresh FCM token
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        requestPushPermission();
      }
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [authToken, user, fetchNotifications]);

  // Listen for foreground push notifications
  useEffect(() => {
    onMessageListener((payload) => {
      const title = payload.notification?.title || payload.data?.title || 'GT-ERP Notification';
      const body = payload.notification?.body || payload.data?.body || '';

      // Trigger toast popup banner
      setActiveToast({
        title,
        body,
        timestamp: new Date()
      });

      // Refresh notification list and badge
      fetchNotifications();
    });
  }, [fetchNotifications]);

  // Auto-dismiss active toast after 6 seconds
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      setActiveToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [activeToast]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        permission,
        fcmToken,
        activeToast,
        dismissToast: () => setActiveToast(null),
        fetchNotifications,
        requestPushPermission,
        markAsRead,
        markAllAsRead,
        removeNotification,
        sendTestNotification
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

