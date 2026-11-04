import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import api from '../services/api';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

let messagingInstance = null;

/**
 * Lazily initialize and retrieve Firebase Cloud Messaging instance
 */
export const getMessagingInstance = async () => {
  if (messagingInstance) return messagingInstance;
  try {
    const supported = await isSupported();
    if (supported && typeof window !== 'undefined') {
      messagingInstance = getMessaging(app);
      return messagingInstance;
    }
    return null;
  } catch (err) {
    console.warn('Firebase Messaging not supported in this browser environment:', err);
    return null;
  }
};

/**
 * Register Service Worker with embedded Firebase credentials
 */
export const registerNotificationServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) return null;

  try {
    // Pass config as URL search params so the service worker has project credentials
    const params = new URLSearchParams({
      apiKey: firebaseConfig.apiKey || '',
      authDomain: firebaseConfig.authDomain || '',
      projectId: firebaseConfig.projectId || '',
      storageBucket: firebaseConfig.storageBucket || '',
      messagingSenderId: firebaseConfig.messagingSenderId || '',
      appId: firebaseConfig.appId || ''
    });

    const registration = await navigator.serviceWorker.register(
      `/firebase-messaging-sw.js?${params.toString()}`,
      { scope: '/' }
    );

    return registration;
  } catch (err) {
    console.warn('Service worker registration error:', err);
    return null;
  }
};

/**
 * Request user permission and obtain FCM Device Registration Token
 */
export const requestFcmToken = async () => {
  try {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return null;
    }

    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    const registration = await registerNotificationServiceWorker();
    if (!registration) return null;

    // Wait until the service worker is active
    await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration
    });

    if (token) {
      // Sync device token to backend
      try {
        await api.post('/notifications/fcm-token', { token });
      } catch (syncErr) {
        console.warn('Failed to sync FCM token to server:', syncErr.message);
      }
      return token;
    }
    return null;
  } catch (error) {
    console.error('An error occurred while retrieving FCM token:', error);
    return null;
  }
};

/**
 * Remove FCM device token from server
 */
export const removeFcmTokenFromServer = async (token) => {
  if (!token) return;
  try {
    await api.delete('/notifications/fcm-token', { token });
  } catch (err) {
    console.warn('Error removing FCM token from backend:', err.message);
  }
};

/**
 * Subscribe to foreground push notifications
 */
export const onMessageListener = (callback) => {
  getMessagingInstance().then((messaging) => {
    if (messaging) {
      onMessage(messaging, (payload) => {
        if (callback && typeof callback === 'function') {
          callback(payload);
        }
      });
    }
  });
};

export default app;

