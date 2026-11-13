import mongoose from 'mongoose';
import Message from '../models/Message.js';
import User from '../models/User.js';
import Employee from '../models/Employee.js'; // Ensure Employee model is registered for populate
import {
  registerMessageStream,
  broadcastMessage,
  broadcastMessageSent,
  broadcastMessageRead
} from '../utils/realtimeService.js';
import { sendNotificationToUser } from '../utils/notificationService.js';

// Real-time SSE stream for current user messages
export const streamMessages = (req, res) => {
  registerMessageStream(req.user._id, req, res);
};

/**
 * List all active conversations for the current user
 * Strictly user-specific: only conversations where current user is sender or recipient
 */
export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all messages involving current user
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const messages = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: userObjectId }, { recipient: userObjectId }]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', userObjectId] },
              '$recipient',
              '$sender'
            ]
          },
          lastMessage: { $first: '$$ROOT' }
        }
      }
    ]);

    if (!messages.length) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    // Populate user and employee info for each conversation participant
    const partnerIds = messages.map((m) => m._id);
    const partners = await User.find({ _id: { $in: partnerIds } })
      .select('fullName email roles employee isDeleted')
      .populate('employee', 'fullName email profileImage department position')
      .lean();

    const partnerMap = new Map(partners.map((p) => [String(p._id), p]));

    // Compute unread counts for each conversation
    const unreadAgg = await Message.aggregate([
      {
        $match: {
          recipient: userObjectId,
          isRead: false
        }
      },
      {
        $group: {
          _id: '$sender',
          unreadCount: { $sum: 1 }
        }
      }
    ]);

    const unreadMap = new Map(unreadAgg.map((u) => [String(u._id), u.unreadCount]));

    const conversations = messages
      .map((item) => {
        const partner = partnerMap.get(String(item._id));
        if (!partner) return null;

        return {
          partner: {
            _id: partner._id,
            fullName: partner.fullName,
            email: partner.email,
            roles: partner.roles,
            employee: partner.employee || null,
            isDeleted: partner.isDeleted
          },
          lastMessage: {
            _id: item.lastMessage._id,
            content: item.lastMessage.content,
            sender: item.lastMessage.sender,
            recipient: item.lastMessage.recipient,
            isRead: item.lastMessage.isRead,
            createdAt: item.lastMessage.createdAt
          },
          unreadCount: unreadMap.get(String(item._id)) || 0
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));

    res.status(200).json({
      success: true,
      data: conversations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations',
      error: error.message
    });
  }
};

/**
 * Get all messages exchanged with a specific user (conversation thread)
 * Automatically marks unread incoming messages as read.
 */
export const getMessagesWithUser = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const targetUser = await User.findById(targetUserId)
      .select('fullName email roles employee isDeleted')
      .populate('employee', 'fullName email profileImage department position');

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Mark unread messages sent by targetUser to current user as read
    const readResult = await Message.updateMany(
      {
        sender: targetUserId,
        recipient: currentUserId,
        isRead: false
      },
      {
        $set: { isRead: true, readAt: new Date() }
      }
    );

    if (readResult.modifiedCount > 0) {
      broadcastMessageRead(targetUserId, {
        readBy: currentUserId,
        readAt: new Date()
      });
    }

    // Fetch conversation thread in chronological order
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, recipient: targetUserId },
        { sender: targetUserId, recipient: currentUserId }
      ]
    })
      .sort({ createdAt: 1 })
      .populate({
        path: 'sender',
        select: 'fullName email roles employee',
        populate: { path: 'employee', select: 'profileImage department position' }
      })
      .populate({
        path: 'recipient',
        select: 'fullName email roles employee',
        populate: { path: 'employee', select: 'profileImage department position' }
      });

    res.status(200).json({
      success: true,
      targetUser,
      data: messages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch message thread',
      error: error.message
    });
  }
};

/**
 * Send a direct message to another user
 */
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { recipientId, content } = req.body;

    if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid recipient ID is required'
      });
    }

    if (String(senderId) === String(recipientId)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot message yourself'
      });
    }

    const trimmedContent = content?.trim();
    if (!trimmedContent) {
      return res.status(400).json({
        success: false,
        message: 'Message content cannot be empty'
      });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient || recipient.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Recipient does not exist or account is deactivated'
      });
    }

    const message = await Message.create({
      sender: senderId,
      recipient: recipientId,
      content: trimmedContent
    });

    const populatedMessage = await Message.findById(message._id)
      .populate({
        path: 'sender',
        select: 'fullName email roles employee',
        populate: { path: 'employee', select: 'profileImage department position' }
      })
      .populate({
        path: 'recipient',
        select: 'fullName email roles employee',
        populate: { path: 'employee', select: 'profileImage department position' }
      });

    // 1. Live SSE push to recipient
    try {
      broadcastMessage(recipientId, populatedMessage);
      broadcastMessageSent(senderId, populatedMessage);
    } catch (e) {
      // Non-blocking
    }

    // 2. Also send in-app notification to recipient
    try {
      await sendNotificationToUser({
        userId: recipientId,
        title: `Message from ${req.user.fullName}`,
        body: trimmedContent.length > 80 ? trimmedContent.substring(0, 77) + '...' : trimmedContent,
        type: 'general',
        data: {
          type: 'message',
          senderId: String(senderId),
          messageId: String(message._id)
        }
      });
    } catch (e) {
      // Non-blocking
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: populatedMessage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
};

/**
 * Mark all messages from a specific sender as read
 */
export const markMessagesAsRead = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.userId;

    const result = await Message.updateMany(
      {
        sender: targetUserId,
        recipient: currentUserId,
        isRead: false
      },
      {
        $set: { isRead: true, readAt: new Date() }
      }
    );

    if (result.modifiedCount > 0) {
      broadcastMessageRead(targetUserId, {
        readBy: currentUserId,
        readAt: new Date()
      });
    }

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} messages marked as read`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark messages as read',
      error: error.message
    });
  }
};

/**
 * Get available colleagues/users to start new chat with
 */
export const getAvailableUsers = async (req, res) => {
  try {
    const { search } = req.query;
    const currentUserId = req.user._id;

    const query = {
      _id: { $ne: currentUserId },
      isDeleted: { $ne: true }
    };

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ fullName: regex }, { email: regex }];
    }

    const users = await User.find(query)
      .select('fullName email roles employee isDeleted')
      .populate('employee', 'fullName email profileImage department position')
      .sort({ fullName: 1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

