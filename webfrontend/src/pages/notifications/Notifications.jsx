import React, { useState } from 'react';
import { useNotification } from '../../context/NotificationContext';
import { useTranslation } from '../../i18n';
import {
  Bell,
  CheckCheck,
  Check,
  RotateCcw,
  Trash2,
  Filter,
  Search,
  Clock,
  Calendar,
  Timer,
  DollarSign,
  Package,
  MessageSquare,
  ShieldCheck,
  Info,
  Radio,
  Sparkles
} from 'lucide-react';

const TYPE_ICONS = {
  attendance: Clock,
  overtime: Timer,
  leave: Calendar,
  payroll: DollarSign,
  stock: Package,
  message: MessageSquare,
  approval: ShieldCheck,
  general: Info
};

export default function Notifications() {
  const { t } = useTranslation();
  const {
    notifications,
    unreadCount,
    readCount,
    allCount,
    loading,
    isRealtimeConnected,
    currentFilter,
    setCurrentFilter,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    removeNotification,
    fetchNotifications
  } = useNotification();

  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSecs = Math.floor((now - date) / 1000);

    if (diffSecs < 60) return 'Just now';
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Client-side filtering for type and search
  const filteredNotifications = notifications.filter((notif) => {
    // Read/Unread filter
    if (currentFilter === 'unread' && notif.isRead) return false;
    if (currentFilter === 'read' && !notif.isRead) return false;

    // Type filter
    if (typeFilter !== 'all') {
      const nType = notif.data?.type || notif.type || 'general';
      if (nType !== typeFilter) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = notif.title?.toLowerCase().includes(q);
      const matchBody = notif.body?.toLowerCase().includes(q);
      if (!matchTitle && !matchBody) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-primary-500/10 dark:bg-primary-500/20 text-primary-500 flex items-center justify-center shrink-0">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {t('nav.notifications') || 'Notifications Center'}
              </h1>
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isRealtimeConnected
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                    : 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span>{isRealtimeConnected ? 'Live Realtime (2s fallback)' : '2s Auto-fetch Fallback'}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              User-specific inbox. Real-time alerts, system updates and personal communications.
            </p>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-2 active:scale-95"
            >
              <CheckCheck className="w-4 h-4 text-primary-500" />
              <span>Mark all as read</span>
            </button>
          )}

          <button
            onClick={() => fetchNotifications(currentFilter)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Refresh"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Read / Unread Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold w-fit">
            <button
              onClick={() => {
                setCurrentFilter('all');
                fetchNotifications('all');
              }}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                currentFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>All</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200">
                {allCount || notifications.length}
              </span>
            </button>

            <button
              onClick={() => {
                setCurrentFilter('unread');
                fetchNotifications('unread');
              }}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                currentFilter === 'unread'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-black animate-pulse">
                  {unreadCount}
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-600">
                  0
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setCurrentFilter('read');
                fetchNotifications('read');
              }}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                currentFilter === 'read'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>Read</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200">
                {readCount}
              </span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 custom-scrollbar text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Type:
          </span>
          {[
            { id: 'all', label: 'All Types' },
            { id: 'general', label: 'General' },
            { id: 'message', label: 'Messages' },
            { id: 'attendance', label: 'Attendance' },
            { id: 'leave', label: 'Leave' },
            { id: 'overtime', label: 'Overtime' },
            { id: 'payroll', label: 'Payroll' },
            { id: 'stock', label: 'Inventory' },
            { id: 'approval', label: 'Approvals' }
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setTypeFilter(type.id)}
              className={`px-2.5 py-1 rounded-lg shrink-0 font-medium transition ${
                typeFilter === type.id
                  ? 'bg-primary-500 text-white font-bold shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {filteredNotifications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {currentFilter === 'unread'
                  ? 'No unread notifications'
                  : currentFilter === 'read'
                  ? 'No read notifications'
                  : 'No notifications found'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {currentFilter === 'unread'
                  ? 'You are all caught up! New alerts and messages will show up in real-time.'
                  : 'No notifications match your current filter settings.'}
              </p>
            </div>
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const rawType = item.data?.type || item.type || 'general';
            const Icon = TYPE_ICONS[rawType] || Bell;
            const isExpanded = expandedId === item._id;

            return (
              <div
                key={item._id}
                onClick={() => setExpandedId(isExpanded ? null : item._id)}
                className={`rounded-2xl border transition cursor-pointer p-4 flex items-start gap-3.5 group ${
                  item.isRead
                    ? 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 opacity-90'
                    : 'border-primary-500/30 dark:border-primary-500/30 bg-primary-50/20 dark:bg-primary-950/20 hover:border-primary-500/50 shadow-2xs'
                }`}
              >
                {/* Type Icon Badge */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    item.isRead
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      : 'bg-primary-500 text-white shadow-xs'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3
                        className={`text-sm truncate ${
                          item.isRead
                            ? 'font-semibold text-slate-800 dark:text-slate-200'
                            : 'font-bold text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {item.title}
                      </h3>
                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-slate-400 shrink-0">
                      {formatTimestamp(item.createdAt)}
                    </span>
                  </div>

                  <p
                    className={`text-xs text-slate-600 dark:text-slate-400 leading-relaxed ${
                      isExpanded ? '' : 'line-clamp-2'
                    }`}
                  >
                    {item.body}
                  </p>

                  {/* Metadata display if expanded */}
                  {isExpanded && item.data && Object.keys(item.data).length > 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 text-[11px] font-mono text-slate-600 dark:text-slate-300 space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">
                        Event Metadata
                      </div>
                      <pre className="overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(item.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div
                  className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition"
                  onClick={(e) => e.stopPropagation()}
                >
                  {item.isRead ? (
                    <button
                      onClick={() => markAsUnread(item._id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Mark as unread"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => markAsRead(item._id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => removeNotification(item._id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    title="Delete notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

