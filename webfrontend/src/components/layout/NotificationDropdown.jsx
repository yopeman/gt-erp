import React, { useState, useRef, useEffect } from 'react';
import { useNotification } from '../../context/NotificationContext';
import {
  Bell,
  BellRing,
  CheckCheck,
  Trash2,
  Send,
  Calendar,
  Timer,
  Clock,
  DollarSign,
  Package,
  Info,
  CheckCircle2,
  X
} from 'lucide-react';

const TYPE_ICONS = {
  attendance: Clock,
  overtime: Timer,
  leave: Calendar,
  payroll: DollarSign,
  stock: Package,
  general: Info
};

export default function NotificationDropdown() {
  const {
    notifications,
    unreadCount,
    loading,
    permission,
    requestPushPermission,
    markAsRead,
    markAllAsRead,
    removeNotification,
    sendTestNotification,
    activeToast,
    dismissToast
  } = useNotification();

  const [isOpen, setIsOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTest = async () => {
    setTesting(true);
    try {
      await sendTestNotification();
    } catch {
      // Handled in context
    } finally {
      setTesting(false);
    }
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const diff = Math.floor((new Date() - new Date(timestamp)) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition active:scale-95"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse shadow-xs">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Browser Permission Callout Banner */}
          {permission !== 'granted' && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <BellRing className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span className="text-[11px] leading-tight">
                  Enable desktop push alerts for instant updates.
                </span>
              </div>
              <button
                onClick={requestPushPermission}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg shrink-0 transition active:scale-95"
              >
                Enable
              </button>
            </div>
          )}

          {/* Notification Items List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
            {loading && notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto text-slate-400">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  All caught up!
                </p>
                <p className="text-[11px] text-slate-400">
                  No notifications yet. You will see alerts here when shifts, overtimes, or requests update.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const IconComponent = TYPE_ICONS[item.type] || Info;
                return (
                  <div
                    key={item._id}
                    onClick={() => !item.isRead && markAsRead(item._id)}
                    className={`p-3 transition flex items-start gap-3 cursor-pointer ${
                      item.isRead
                        ? 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                        : 'bg-primary-50/40 dark:bg-primary-950/20 hover:bg-primary-50/70'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs ${
                        item.isRead
                          ? 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                          : 'bg-primary-100 dark:bg-primary-900/60 text-primary-600 dark:text-primary-300'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4
                          className={`text-xs truncate ${
                            item.isRead
                              ? 'text-slate-700 dark:text-slate-300 font-medium'
                              : 'text-slate-900 dark:text-slate-100 font-bold'
                          }`}
                        >
                          {item.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {item.body}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNotification(item._id);
                      }}
                      className="p-1 text-slate-300 hover:text-rose-500 transition shrink-0"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with Test Button */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-mono text-[10px]">
              FCM: {permission === 'granted' ? '● Connected' : '○ Standby'}
            </span>
            <button
              onClick={handleTest}
              disabled={testing}
              className="px-2.5 py-1 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 rounded-lg font-bold flex items-center gap-1 transition disabled:opacity-50"
            >
              <Send className="w-3 h-3" />
              <span>{testing ? 'Sending...' : 'Send Test Alert'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Foreground Push Toast */}
      {activeToast && (
        <div className="fixed bottom-5 right-5 z-70 max-w-sm rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl p-4 animate-in slide-in-from-bottom-3 duration-200 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-950 text-primary-600 flex items-center justify-center shrink-0">
            <BellRing className="w-5 h-5 animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              {activeToast.title}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              {activeToast.body}
            </p>
          </div>
          <button
            onClick={dismissToast}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

