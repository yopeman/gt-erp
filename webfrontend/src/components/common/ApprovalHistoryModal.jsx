import React, { useState, useEffect } from 'react';
import { 
  History, 
  X, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Send, 
  AlertCircle,
  FileCheck2,
  DollarSign,
  Loader2 
} from 'lucide-react';
import api from '../../services/api';

const ACTION_ICONS = {
  submitted: Send,
  manager_approved: FileCheck2,
  approved: CheckCircle2,
  accepted: CheckCircle2,
  cleared: CheckCircle2,
  paid: DollarSign,
  rejected: XCircle,
  cancelled: AlertCircle,
};

const ACTION_COLORS = {
  submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  manager_approved: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  accepted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  cleared: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  cancelled: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
};

export default function ApprovalHistoryModal({
  isOpen,
  onClose,
  referenceType,
  referenceId,
  title = 'Approval Audit Timeline'
}) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !referenceId) return;

    const fetchHistory = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/approval-history', {
          params: { referenceType, referenceId }
        });
        if (response.success && Array.isArray(response.data)) {
          setHistory(response.data);
        } else if (Array.isArray(response)) {
          setHistory(response);
        } else {
          setHistory([]);
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load audit history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [isOpen, referenceType, referenceId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {title}
              </h3>
              <p className="text-xs text-slate-500 capitalize">
                Audit Trail for {referenceType}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Timeline Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
              <span className="text-xs">Loading audit events...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-xl text-xs">
              {error}
            </div>
          ) : history.length === 0 ? (
            <div className="py-10 text-center text-slate-400 space-y-1">
              <Clock className="w-8 h-8 mx-auto stroke-1 opacity-50" />
              <p className="text-xs">No recorded approval events found for this item.</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {history.map((event, idx) => {
                const IconComponent = ACTION_ICONS[event.action] || Clock;
                const badgeColor = ACTION_COLORS[event.action] || 'bg-slate-100 text-slate-700 border-slate-200';

                return (
                  <div key={event._id || idx} className="relative group">
                    {/* Circle Node on Timeline */}
                    <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white dark:bg-slate-900 border-2 border-primary-500 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider border ${badgeColor}`}>
                          <IconComponent className="w-3 h-3" />
                          {event.action?.replace('_', ' ')}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {event.actionDate ? new Date(event.actionDate).toLocaleString() : 'N/A'}
                        </span>
                      </div>

                      {event.comment && (
                        <p className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
                          "{event.comment}"
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                        <span>Action By:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {event.actionBy?.fullName || event.actionBy?.email || 'System'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
