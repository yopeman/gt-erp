import React, { useState, useEffect, useRef, useCallback } from 'react';
import api, { API_BASE_URL } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import {
  MessageSquare,
  Search,
  Plus,
  Send,
  User as UserIcon,
  Check,
  CheckCheck,
  RotateCcw,
  X,
  Phone,
  Mail,
  Building2,
  Briefcase,
  Sparkles
} from 'lucide-react';

/**
 * Reusable User Avatar Component
 * Strictly satisfies:
 * "in messages show user/employee profile image if connected user to employee else use users first letter"
 */
export function UserAvatar({ user, size = 'md', className = '' }) {
  const profileImage = user?.employee?.profileImage;
  const initial = user?.fullName?.trim()?.charAt(0)?.toUpperCase() || 'U';

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-14 h-14 text-lg'
  };

  const chosenSize = sizeClasses[size] || sizeClasses.md;

  if (profileImage) {
    return (
      <img
        src={profileImage}
        alt={user?.fullName || 'User Profile'}
        className={`${chosenSize} rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0 ${className}`}
        onError={(e) => {
          // Fallback if image path is broken
          e.target.style.display = 'none';
          if (e.target.nextSibling) {
            e.target.nextSibling.style.display = 'flex';
          }
        }}
      />
    );
  }

  return (
    <div
      className={`${chosenSize} rounded-full bg-primary-100 dark:bg-primary-950/70 text-primary-600 dark:text-primary-300 font-black flex items-center justify-center border border-primary-500/20 shadow-2xs shrink-0 uppercase select-none ${className}`}
    >
      {initial}
    </div>
  );
}

export default function Messages() {
  const { t } = useTranslation();
  const { user: currentUser, token: authToken } = useAuth();

  // Conversations & Active Thread State
  const [conversations, setConversations] = useState([]);
  const [activePartner, setActivePartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  // Search & New Chat Directory
  const [conversationSearch, setConversationSearch] = useState('');
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [userDirectory, setUserDirectory] = useState([]);
  const [userDirectorySearch, setUserDirectorySearch] = useState('');
  const [loadingDirectory, setLoadingDirectory] = useState(false);

  // Message Input
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const activePartnerRef = useRef(activePartner);

  useEffect(() => {
    activePartnerRef.current = activePartner;
  }, [activePartner]);

  // Scroll to bottom of message thread
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  // Fetch Conversations List
  const fetchConversations = useCallback(async (isSilent = false) => {
    if (!authToken) return;
    if (!isSilent) setLoadingConversations(true);

    try {
      const res = await api.get('/messages/conversations');
      if (res.success && Array.isArray(res.data)) {
        setConversations(res.data);
      }
    } catch (err) {
      if (!isSilent) console.warn('Failed to load conversations:', err);
    } finally {
      if (!isSilent) setLoadingConversations(false);
    }
  }, [authToken]);

  // Fetch Messages with Active Partner
  const fetchThreadMessages = useCallback(async (partnerId, isSilent = false) => {
    if (!authToken || !partnerId) return;
    if (!isSilent) setLoadingMessages(true);

    try {
      const res = await api.get(`/messages/user/${partnerId}`);
      if (res.success && Array.isArray(res.data)) {
        setMessages(res.data);
        if (res.targetUser) {
          setActivePartner(res.targetUser);
        }

        // Mark as read in local conversations state
        setConversations((prev) =>
          prev.map((c) =>
            c.partner._id === partnerId ? { ...c, unreadCount: 0 } : c
          )
        );
      }
    } catch (err) {
      if (!isSilent) console.warn('Failed to load message thread:', err);
    } finally {
      if (!isSilent) setLoadingMessages(false);
    }
  }, [authToken]);

  // Fetch Available Colleagues for New Chat
  const fetchUserDirectory = async (search = '') => {
    setLoadingDirectory(true);
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await api.get(`/messages/users${query}`);
      if (res.success && Array.isArray(res.data)) {
        setUserDirectory(res.data);
      }
    } catch (err) {
      console.warn('Failed to load user directory:', err);
    } finally {
      setLoadingDirectory(false);
    }
  };

  // Open New Chat Dialog
  const handleOpenNewChat = () => {
    setIsNewChatModalOpen(true);
    fetchUserDirectory();
  };

  // Select User to Chat with
  const handleSelectUserToChat = (user) => {
    setActivePartner(user);
    setIsNewChatModalOpen(false);
    fetchThreadMessages(user._id);
  };

  // Send Message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || !activePartner || sending) return;

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const res = await api.post('/messages', {
        recipientId: activePartner._id,
        content: messageText
      });

      if (res.success && res.data) {
        setMessages((prev) => [...prev, res.data]);

        // Update or insert conversation in list
        setConversations((prev) => {
          const exists = prev.find((c) => c.partner._id === activePartner._id);
          if (exists) {
            return prev.map((c) =>
              c.partner._id === activePartner._id
                ? { ...c, lastMessage: res.data }
                : c
            );
          } else {
            return [
              {
                partner: activePartner,
                lastMessage: res.data,
                unreadCount: 0
              },
              ...prev
            ];
          }
        });

        setTimeout(() => scrollToBottom(), 50);
      }
    } catch (err) {
      console.warn('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Scroll to bottom on initial thread load
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(false);
    }
  }, [activePartner?._id]);

  // Real-time SSE listener
  useEffect(() => {
    if (!authToken || !currentUser) return;

    let eventSource = null;
    try {
      const sseUrl = `${API_BASE_URL}/messages/realtime?token=${encodeURIComponent(authToken)}`;
      eventSource = new EventSource(sseUrl);

      eventSource.onopen = () => {
        setIsRealtimeConnected(true);
      };

      // When a new incoming message arrives
      eventSource.addEventListener('new_message', (e) => {
        try {
          const msg = JSON.parse(e.data);
          const currentActive = activePartnerRef.current;

          // If the message is from our active chat partner
          if (currentActive && String(msg.sender?._id || msg.sender) === String(currentActive._id)) {
            setMessages((prev) => {
              if (prev.some((m) => m._id === msg._id)) return prev;
              return [...prev, msg];
            });
            setTimeout(() => scrollToBottom(), 50);

            // Mark as read immediately on server
            api.patch(`/messages/user/${currentActive._id}/read`);
          }

          // Refresh conversations to update preview and unread counters
          fetchConversations(true);
        } catch (err) {
          console.warn('Error processing SSE new_message event:', err);
        }
      });

      // When a message sent from another tab arrives
      eventSource.addEventListener('sent_message', (e) => {
        try {
          const msg = JSON.parse(e.data);
          const currentActive = activePartnerRef.current;
          if (currentActive && String(msg.recipient?._id || msg.recipient) === String(currentActive._id)) {
            setMessages((prev) => {
              if (prev.some((m) => m._id === msg._id)) return prev;
              return [...prev, msg];
            });
            setTimeout(() => scrollToBottom(), 50);
          }
          fetchConversations(true);
        } catch (err) {
          // ignore
        }
      });

      // When partner reads messages (read receipt)
      eventSource.addEventListener('message_read', (e) => {
        try {
          const data = JSON.parse(e.data);
          setMessages((prev) =>
            prev.map((m) =>
              String(m.recipient?._id || m.recipient) === String(data.readBy)
                ? { ...m, isRead: true, readAt: data.readAt }
                : m
            )
          );
        } catch (err) {
          // ignore
        }
      });

      eventSource.onerror = () => {
        setIsRealtimeConnected(false);
      };
    } catch (err) {
      console.warn('Could not connect to SSE message stream:', err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [authToken, currentUser, fetchConversations]);

  // Realtime Fail-safe: 2-second auto-fetch polling fallback
  useEffect(() => {
    if (!authToken || !currentUser) return;

    const interval = setInterval(() => {
      // 1. Silently refresh conversation list
      fetchConversations(true);

      // 2. Silently refresh message thread if a conversation is open
      const currentActive = activePartnerRef.current;
      if (currentActive?._id) {
        api.get(`/messages/user/${currentActive._id}`).then((res) => {
          if (res.success && Array.isArray(res.data)) {
            setMessages((prev) => {
              // Only update if count or IDs changed to avoid re-render jump
              if (res.data.length !== prev.length || res.data[res.data.length - 1]?._id !== prev[prev.length - 1]?._id) {
                setTimeout(() => scrollToBottom(), 50);
                return res.data;
              }
              // Update read status flags
              return res.data;
            });
          }
        }).catch(() => {});
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [authToken, currentUser, fetchConversations]);

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (!conversationSearch.trim()) return true;
    const q = conversationSearch.toLowerCase();
    const nameMatch = c.partner.fullName?.toLowerCase().includes(q);
    const emailMatch = c.partner.email?.toLowerCase().includes(q);
    const lastMsgMatch = c.lastMessage?.content?.toLowerCase().includes(q);
    return nameMatch || emailMatch || lastMsgMatch;
  });

  const formatMessageTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatConversationTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSecs = Math.floor((now - date) / 1000);

    if (diffSecs < 60) return 'Just now';
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col max-w-7xl mx-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
      {/* Messages App Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Conversation List */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 ${
            activePartner ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary-500/10 text-primary-500 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h2 className="font-black text-sm text-slate-900 dark:text-slate-100 tracking-tight">
                  {t('nav.messages') || 'Direct Messages'}
                </h2>
              </div>

              {/* Realtime Live Indicator */}
              <div
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isRealtimeConnected
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                    : 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                }`}
                title={isRealtimeConnected ? 'Live Real-time SSE active' : '2s Auto-fetch Fallback active'}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isRealtimeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span>{isRealtimeConnected ? 'Live' : '2s Poll'}</span>
              </div>
            </div>

            {/* Search & New Chat Button */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={conversationSearch}
                  onChange={(e) => setConversationSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <button
                onClick={handleOpenNewChat}
                className="p-2 rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition shadow-2xs shrink-0 active:scale-95"
                title="Start a new message"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800/60">
            {loadingConversations ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Loading conversations...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {conversationSearch ? 'No chats match your search' : 'No conversations yet'}
                </p>
                <button
                  onClick={handleOpenNewChat}
                  className="text-xs font-bold text-primary-500 hover:underline"
                >
                  Start a new chat with a colleague →
                </button>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = activePartner?._id === c.partner._id;
                return (
                  <div
                    key={c.partner._id}
                    onClick={() => {
                      setActivePartner(c.partner);
                      fetchThreadMessages(c.partner._id);
                    }}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition ${
                      isSelected
                        ? 'bg-primary-50/50 dark:bg-primary-950/30 border-l-4 border-primary-500'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {/* User / Employee Profile Image (or User's first letter) */}
                    <div className="relative shrink-0">
                      <UserAvatar user={c.partner} size="md" />
                      {c.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse shadow-xs">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {c.partner.fullName}
                        </h4>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatConversationTime(c.lastMessage?.createdAt)}
                        </span>
                      </div>

                      {/* Position / Role Snippet */}
                      <p className="text-[10px] font-medium text-primary-600 dark:text-primary-400 truncate">
                        {c.partner.employee?.position || c.partner.roles?.join(', ')}
                      </p>

                      {/* Last Message Preview */}
                      <p
                        className={`text-xs truncate ${
                          c.unreadCount > 0
                            ? 'font-bold text-slate-900 dark:text-slate-100'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {c.lastMessage?.sender === currentUser?._id && (
                          <span className="text-slate-400 mr-1 font-normal">You:</span>
                        )}
                        {c.lastMessage?.content}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Active Chat Window */}
        <div
          className={`flex-1 flex flex-col bg-slate-50/40 dark:bg-slate-950/40 ${
            !activePartner ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activePartner ? (
            <>
              {/* Chat Header */}
              <div className="h-16 px-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setActivePartner(null)}
                    className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    ← Back
                  </button>

                  {/* Partner Avatar: profile image or first letter */}
                  <UserAvatar user={activePartner} size="md" />

                  <div className="min-w-0 leading-tight">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                      {activePartner.fullName}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
                      <span>{activePartner.employee?.department || 'GT Press'}</span>
                      {activePartner.employee?.position && (
                        <>
                          <span>•</span>
                          <span>{activePartner.employee.position}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                    {activePartner.email}
                  </span>
                  <button
                    onClick={() => fetchThreadMessages(activePartner._id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title="Refresh thread"
                  >
                    <RotateCcw className={`w-4 h-4 ${loadingMessages ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Messages Thread Body */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
                {loadingMessages && messages.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-16 text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-primary-50 dark:bg-primary-950/40 text-primary-500 flex items-center justify-center mx-auto">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      No messages yet with {activePartner.fullName}
                    </h4>
                    <p className="text-xs text-slate-400">
                      Say hello to start the conversation!
                    </p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isMe =
                      msg.sender?._id === currentUser?._id ||
                      msg.sender === currentUser?._id;

                    return (
                      <div
                        key={msg._id || index}
                        className={`flex items-end gap-2 ${
                          isMe ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {/* Partner Avatar on left of received message */}
                        {!isMe && (
                          <UserAvatar
                            user={msg.sender?.fullName ? msg.sender : activePartner}
                            size="sm"
                            className="mb-1"
                          />
                        )}

                        <div
                          className={`max-w-[78%] sm:max-w-[65%] rounded-2xl p-3 shadow-2xs space-y-1 ${
                            isMe
                              ? 'bg-primary-500 text-white rounded-br-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-bl-xs'
                          }`}
                        >
                          <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                            {msg.content}
                          </p>
                          <div
                            className={`flex items-center justify-end gap-1 text-[10px] ${
                              isMe ? 'text-primary-100' : 'text-slate-400'
                            }`}
                          >
                            <span>{formatMessageTime(msg.createdAt)}</span>
                            {isMe && (
                              <span>
                                {msg.isRead ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-sky-200" title="Read" />
                                ) : (
                                  <Check className="w-3 h-3 text-primary-200" title="Sent" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Box */}
              <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                <form
                  onSubmit={handleSendMessage}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder={`Message ${activePartner.fullName}...`}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || sending}
                    className="p-2.5 rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-xs active:scale-95 shrink-0"
                    title="Send Message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* Placeholder when no conversation is selected */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                <MessageSquare className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Select a Conversation
                </h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Choose a chat from the left panel or click below to start a new direct conversation with any colleague.
                </p>
              </div>
              <button
                onClick={handleOpenNewChat}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-primary-500 text-white hover:bg-primary-600 transition shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>New Direct Message</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal (User Directory) */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary-500" />
                <span>New Conversation</span>
              </h3>
              <button
                onClick={() => setIsNewChatModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Colleagues */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search colleagues by name or email..."
                  value={userDirectorySearch}
                  onChange={(e) => {
                    setUserDirectorySearch(e.target.value);
                    fetchUserDirectory(e.target.value);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  autoFocus
                />
              </div>
            </div>

            {/* Directory List */}
            <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/60 custom-scrollbar">
              {loadingDirectory ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Loading colleagues...
                </div>
              ) : userDirectory.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No colleagues found.
                </div>
              ) : (
                userDirectory.map((colleague) => (
                  <div
                    key={colleague._id}
                    onClick={() => handleSelectUserToChat(colleague)}
                    className="p-2.5 rounded-xl flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition"
                  >
                    {/* User profile image if connected to employee else user's first letter */}
                    <UserAvatar user={colleague} size="md" />

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {colleague.fullName}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">
                        {colleague.employee?.position || colleague.employee?.department || colleague.email}
                      </p>
                    </div>

                    <span className="text-[10px] font-bold text-primary-500 uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary-50 dark:bg-primary-950/60 shrink-0">
                      Chat
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

