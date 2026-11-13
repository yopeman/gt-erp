/**
 * Real-time SSE (Server-Sent Events) Service for GT-ERP
 * Manages live SSE connections for Notifications and Messages
 * with automatic keep-alive pings and fail-safe connection cleanup.
 */

const notificationClients = new Map(); // userId string -> Set of Express Response objects
const messageClients = new Map();      // userId string -> Set of Express Response objects

// Helper to remove closed client
const cleanupClient = (clientMap, userId, res) => {
  const set = clientMap.get(String(userId));
  if (set) {
    set.delete(res);
    if (set.size === 0) {
      clientMap.delete(String(userId));
    }
  }
};

/**
 * Register a client for live Notification SSE events
 */
export const registerNotificationStream = (userId, req, res) => {
  const uid = String(userId);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  if (!notificationClients.has(uid)) {
    notificationClients.set(uid, new Set());
  }
  notificationClients.get(uid).add(res);

  // Send initial hand-shake
  res.write(`data: ${JSON.stringify({ type: 'connected', channel: 'notifications', timestamp: new Date().toISOString() })}\n\n`);

  req.on('close', () => {
    cleanupClient(notificationClients, uid, res);
  });
};

/**
 * Register a client for live Message SSE events
 */
export const registerMessageStream = (userId, req, res) => {
  const uid = String(userId);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  if (!messageClients.has(uid)) {
    messageClients.set(uid, new Set());
  }
  messageClients.get(uid).add(res);

  // Send initial hand-shake
  res.write(`data: ${JSON.stringify({ type: 'connected', channel: 'messages', timestamp: new Date().toISOString() })}\n\n`);

  req.on('close', () => {
    cleanupClient(messageClients, uid, res);
  });
};

/**
 * Broadcast notification to a specific user
 */
export const broadcastNotification = (userId, notification) => {
  const uid = String(userId);
  const clients = notificationClients.get(uid);
  if (clients && clients.size > 0) {
    const payload = `event: notification\ndata: ${JSON.stringify(notification)}\n\n`;
    for (const res of clients) {
      try {
        res.write(payload);
      } catch (err) {
        clients.delete(res);
      }
    }
  }
};

/**
 * Broadcast new message to recipient and sender
 */
export const broadcastMessage = (recipientId, message) => {
  const rId = String(recipientId);
  const clients = messageClients.get(rId);
  if (clients && clients.size > 0) {
    const payload = `event: new_message\ndata: ${JSON.stringify(message)}\n\n`;
    for (const res of clients) {
      try {
        res.write(payload);
      } catch (err) {
        clients.delete(res);
      }
    }
  }
};

/**
 * Notify sender that message was sent (e.g. for multi-device sync)
 */
export const broadcastMessageSent = (senderId, message) => {
  const sId = String(senderId);
  const clients = messageClients.get(sId);
  if (clients && clients.size > 0) {
    const payload = `event: sent_message\ndata: ${JSON.stringify(message)}\n\n`;
    for (const res of clients) {
      try {
        res.write(payload);
      } catch (err) {
        clients.delete(res);
      }
    }
  }
};

/**
 * Broadcast read receipts
 */
export const broadcastMessageRead = (senderId, readInfo) => {
  const sId = String(senderId);
  const clients = messageClients.get(sId);
  if (clients && clients.size > 0) {
    const payload = `event: message_read\ndata: ${JSON.stringify(readInfo)}\n\n`;
    for (const res of clients) {
      try {
        res.write(payload);
      } catch (err) {
        clients.delete(res);
      }
    }
  }
};

// Periodic heartbeat keep-alive to keep SSE streams alive through reverse proxies
setInterval(() => {
  const heartbeat = ': keepalive\n\n';
  for (const set of notificationClients.values()) {
    for (const res of set) {
      try {
        res.write(heartbeat);
      } catch {
        set.delete(res);
      }
    }
  }
  for (const set of messageClients.values()) {
    for (const res of set) {
      try {
        res.write(heartbeat);
      } catch {
        set.delete(res);
      }
    }
  }
}, 20000);

export default {
  registerNotificationStream,
  registerMessageStream,
  broadcastNotification,
  broadcastMessage,
  broadcastMessageSent,
  broadcastMessageRead
};

