import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { ERP_MODULES } from '../../config/modules';
import {
  Users,
  LayoutDashboard,
  UserCheck,
  Clock,
  CalendarDays,
  Scale,
  Timer,
  CreditCard,
  Briefcase,
  GraduationCap,
  FileCheck2,
  Shield,
  ShieldCheck,
  Package,
  ShoppingCart,
  Factory,
  TrendingUp,
  Landmark,
  Globe,
  ChevronDown,
  ChevronRight,
  X
} from 'lucide-react';

const iconMap = {
  Users,
  LayoutDashboard,
  UserCheck,
  Clock,
  CalendarDays,
  Scale,
  Timer,
  CreditCard,
  Briefcase,
  Globe,
  GraduationCap,
  FileCheck2,
  Shield,
  ShieldCheck,
  Package,
  ShoppingCart,
  Factory,
  TrendingUp,
  Landmark
};

export default function Sidebar({ isOpen, onClose }) {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const location = useLocation();

  // Track expanded modules in sidebar
  const [expandedModules, setExpandedModules] = useState({
    hr: true,
    admin: true,
  });

  const toggleModule = (moduleId) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  // Filter modules based on user RBAC
  const visibleModules = ERP_MODULES.filter((module) => {
    if (!module.requiredRoles || module.requiredRoles.length === 0) return true;
    return hasRole(module.requiredRoles);
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/gt-logo.jpg" 
              alt="GT Logo" 
              className="h-9 w-9 rounded-xl object-contain border border-primary-500/20 shadow-xs"
            />
            <div className="leading-tight">
              <div className="font-black text-sm tracking-tight text-primary-500">
                GT PRINTING
              </div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Enterprise ERP
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modules & Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {visibleModules.map((module) => {
            const ModuleIcon = iconMap[module.icon] || Users;
            const isExpanded = expandedModules[module.id] ?? false;

            // Filter submodules by RBAC
            const visibleSubmodules = module.submodules.filter((sub) => {
              if (!sub.requiredRoles || sub.requiredRoles.length === 0) return true;
              return hasRole(sub.requiredRoles);
            });

            if (visibleSubmodules.length === 0) return null;

            return (
              <div key={module.id} className="space-y-1">
                {/* Module Header Accordion */}
                <button
                  onClick={() => toggleModule(module.id)}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition group"
                >
                  <div className="flex items-center gap-2">
                    <ModuleIcon className="w-4 h-4 text-primary-500" />
                    <span>{t(module.titleKey) || module.titleKey}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {module.status === 'upcoming' && (
                      <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-sm bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300">
                        {module.phase}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                    )}
                  </div>
                </button>

                {/* Submodule Links */}
                {isExpanded && (
                  <div className="pl-2 space-y-0.5">
                    {visibleSubmodules.map((sub) => {
                      const SubIcon = iconMap[sub.icon] || LayoutDashboard;
                      const isSubActive = location.pathname === sub.path;

                      return (
                        <NavLink
                          key={sub.id}
                          to={sub.path}
                          onClick={() => {
                            if (window.innerWidth < 1024) onClose();
                          }}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                            isSubActive
                              ? 'bg-primary-500 text-white shadow-xs font-bold'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <SubIcon className={`w-4 h-4 ${isSubActive ? 'text-white' : 'text-slate-400'}`} />
                          <span className="truncate">{t(sub.titleKey) || sub.titleKey}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 text-center">
          GT Printing ERP v1.0 • Phase 1
        </div>
      </aside>
    </>
  );
}
