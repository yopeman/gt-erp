import React from 'react';
import { useTranslation } from '../../i18n';

export default function StatCard({ title, value, subtitle, icon: Icon, tag, trend, onClick }) {
  const { t } = useTranslation();

  return (
    <div 
      onClick={onClick}
      className={`p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs hover:border-primary-500/50 hover:shadow-md transition-all ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-500 dark:text-primary-400 flex items-center justify-center font-bold">
          {Icon ? <Icon className="w-5 h-5" /> : null}
        </div>
        {tag && (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">
            {t(tag)}
          </span>
        )}
      </div>

      <div className="mt-4">
        <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          {value}
        </div>
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
          {t(title)}
        </div>
        {subtitle && (
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            {t(subtitle)}
          </div>
        )}
      </div>
    </div>
  );
}
