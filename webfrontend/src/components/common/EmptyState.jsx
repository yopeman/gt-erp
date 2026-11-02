import React from 'react';
import { PackageOpen } from 'lucide-react';

export default function EmptyState({ title, message, actionText, onAction, icon: Icon = PackageOpen }) {
  return (
    <div className="p-8 sm:p-12 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 text-center">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-700/60 text-slate-400 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
        {title || 'No records found'}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
        {message || 'There is no data returned from the backend service for this query.'}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold text-xs rounded-xl shadow-xs transition active:scale-95"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
