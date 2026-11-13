import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import api, { API_BASE_URL } from '../services/api';
import { requestFcmToken, onMessageListener } from '../config/firebase';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, token: authToken } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [readCount, setReadCount] = useState(0);
  const [allCount, setAllCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [currentFilter, setCurrentFilter] = useState('all'); // 'all' | 'unread' | 'read'
  const [fcmToken, setFcmToken] = useState(() => localStorage.getItem('gt_erp_fcm_token') || null);
  const [permission, setPermission] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  // Active foreground toast notification popup
  const [activeToast, setActiveToast] = useState(null);

  // Reference to avoid stale closures in SSE and interval handlers
  const filterRef = useRef(currentFilter);
  useEffect(() => {
    filterRef.current = currentFilter;
  }, [currentFilter]);

  // Fetch notifications with optional status/filter parameter
  const fetchNotifications = useCallback(async (filterOverride, isSilent = false) => {
    if (!authToken || !user) return;
    if (!isSilent) setLoading(true);

    const filterToUse = filterOverride !== undefined ? filterOverride : filterRef.current;

    try {
      const queryParams = new URLSearchParams({ limit: '50' });
      if (filterToUse && filterToUse !== 'all') {
        queryParams.set('filter', filterToUse);
      }

      const response = await api.get(`/notifications?${queryParams.toString()}`);
      if (response.success && Array.isArray(response.data)) {
        setNotifications(response.data);
        if (response.unreadCount !== undefined) setUnreadCount(response.unreadCount);
        if (response.readCount !== undefined) setReadCount(response.readCount);
        if (response.allCount !== undefined) setAllCount(response.allCount);
      }
    } catch (err) {
      // Avoid spamming error console during background polling
      if (!isSilent) {
        console.warn('Could not fetch notifications:', err);
      }
    } finally {
      if (!isSilent) setLoading(false);
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
        if (response.unreadCount !== undefined) {
          setUnreadCount(response.unreadCount);
        } else {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
        if (response.readCount !== undefined) setReadCount(response.readCount);
      }
    } catch (err) {
      console.warn('Failed to mark notification as read:', err);
    }
  };

  // Mark single notification as unread
  const markAsUnread = async (id) => {
    try {
      const response = await api.patch(`/notifications/${id}/unread`);
      if (response.success) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: false } : n))
        );
        if (response.unreadCount !== undefined) {
          setUnreadCount(response.unreadCount);
        } else {
          setUnreadCount((prev) => prev + 1);
        }
        if (response.readCount !== undefined) setReadCount(response.readCount);
      }
    } catch (err) {
      console.warn('Failed to mark notification as unread:', err);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const response = await api.patch('/notifications/read-all');
      if (response.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        setReadCount(allCount);
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
        fetchNotifications(filterRef.current, true);
      }
    } catch (err) {
      console.warn('Failed to delete notification:', err);
    }
  };

  // Send test push notification
  const sendTestNotification = async () => {
    try {
      const response = await api.post('/notifications/test', {
        title: 'GT-ERP Notification Test',
        body: 'Real-time SSE and push notifications are active!'
      });
      if (response.success) {
        await fetchNotifications(filterRef.current, true);
        return true;
      }
    } catch (err) {
      console.warn('Test notification dispatch failed:', err);
      throw err;
    }
  };

  // Real-time SSE connection for instantaneous notification events
  useEffect(() => {
    if (!authToken || !user) {
      setIsRealtimeConnected(false);
      return;
    }

    let eventSource = null;
    try {
      const sseUrl = `${API_BASE_URL}/notifications/realtime?token=${encodeURIComponent(authToken)}`;
      eventSource = new EventSource(sseUrl);

      eventSource.onopen = () => {
        setIsRealtimeConnected(true);
      };

      eventSource.addEventListener('notification', (e) => {
        try {
          const newNotif = JSON.parse(e.data);
          setActiveToast({
            title: newNotif.title || 'New Notification',
            body: newNotif.body || '',
            timestamp: new Date()
          });

          // Prepend to current list if matches filter
          setNotifications((prev) => {
            if (filterRef.current === 'read') return prev; // Don't show unread in 'read' tab
            if (prev.some((n) => n._id === newNotif._id)) return prev;
            return [newNotif, ...prev];
          });
          setUnreadCount((prev) => prev + 1);
          setAllCount((prev) => prev + 1);
        } catch (err) {
          fetchNotifications(filterRef.current, true);
        }
      });

      eventSource.onerror = () => {
        setIsRealtimeConnected(false);
        // Will rely on the 2s auto-fetch fallback
      };
    } catch (err) {
      console.warn('Could not establish SSE notification stream:', err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [authToken, user, fetchNotifications]);

  // Realtime Fail-safe: 2-second auto-fetch polling fallback
  useEffect(() => {
    if (!authToken || !user) return;

    // Run first initial fetch immediately
    fetchNotifications(currentFilter);

    // Refresh FCM if permission granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      requestPushPermission();
    }

    // 2-second auto-fetch failback interval
    const interval = setInterval(() => {
      fetchNotifications(filterRef.current, true);
    }, 2000);

    return () => clearInterval(interval);
  }, [authToken, user, currentFilter, fetchNotifications]);

  // Listen for FCM foreground push notifications
  useEffect(() => {
    onMessageListener((payload) => {
      const title = payload.notification?.title || payload.data?.title || 'GT-ERP Notification';
      const body = payload.notification?.body || payload.data?.body || '';

      setActiveToast({
        title,
        body,
        timestamp: new Date()
      });

      fetchNotifications(filterRef.current, true);
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
        readCount,
        allCount,
        loading,
        permission,
        fcmToken,
        isRealtimeConnected,
        currentFilter,
        setCurrentFilter,
        activeToast,
        dismissToast: () => setActiveToast(null),
        fetchNotifications,
        requestPushPermission,
        markAsRead,
        markAsUnread,
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
