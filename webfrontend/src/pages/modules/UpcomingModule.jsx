import React from 'react';
import { useTranslation } from '../../i18n';
import { ERP_MODULES } from '../../config/modules';
import { Clock, CheckCircle2, ArrowRight } from 'lucide-react';

export default function UpcomingModule({ moduleId }) {
  const { t } = useTranslation();
  const moduleInfo = ERP_MODULES.find((m) => m.id === moduleId);

  if (!moduleInfo) {
    return <div>Module not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 sm:p-8 border border-slate-700 shadow-md">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider mb-3">
          <Clock className="w-3.5 h-3.5" />
          {moduleInfo.phase || 'Roadmap'} • Ready for Backend Integration
        </div>
        <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white">
          {t(moduleInfo.titleKey) || moduleInfo.titleKey}
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
          {moduleInfo.description}
        </p>
      </div>

      {/* Functional Scope from PDF */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">
          Planned Submodules & Workflows
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {moduleInfo.submodules?.map((sub) => (
            <div 
              key={sub.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50"
            >
              <div className="flex items-center gap-2 text-primary-500 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>{sub.titleKey}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Route path registered at <code className="text-primary-500 font-mono text-[11px]">{sub.path}</code>
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/80 text-xs text-slate-500 flex items-center justify-between">
          <span>Non-blocking architecture: HR foundation is active and live right now.</span>
          <span className="font-semibold text-primary-500 flex items-center gap-1">
            Modular ERP Monolith <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
}
