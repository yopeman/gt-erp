import React from 'react';
import { useTranslation } from '../../i18n';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Menu, Sun, Moon, LogOut, User as UserIcon, ShieldAlert } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';

export default function Header({ onToggleSidebar, backendConnected = true }) {
  const { t, lang, setLanguage } = useTranslation();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile hamburger & Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 lg:hidden">
          <img 
            src="/gt-logo.jpg" 
            alt="GT Logo" 
            className="h-8 w-8 rounded-lg object-contain border border-primary-500/20 shadow-2xs"
          />
          <span className="font-black text-sm text-primary-500 tracking-tight">
            GT ERP
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live Backend Connection Indicator */}
        <div 
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-700/60"
          title="Direct integration with Express/MongoDB API"
        >
          <span className={`w-2 h-2 rounded-full ${backendConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <span className="text-slate-600 dark:text-slate-300">
            {backendConnected ? t('common.connected') : t('common.offline')}
          </span>
        </div>

        {/* Language Switcher (Amharic / English) */}
        <button
          onClick={() => setLanguage(lang === 'en' ? 'am' : 'en')}
          className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 transition active:scale-95"
          title="Switch Language"
        >
          <span>{lang === 'en' ? '🇪🇹' : '🇬🇧'}</span>
          <span className="font-bold">{lang === 'en' ? 'አማርኛ' : 'EN'}</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition active:scale-95"
          title={`Toggle Theme (${resolvedTheme})`}
          aria-label="Toggle theme"
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>

        {/* Firebase Push & In-App Notification Bell */}
        {user ? <NotificationDropdown /> : null}

        {/* User Profile Badge / Sign Out */}
        {user ? (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
            <div className="hidden md:block text-right leading-tight">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {user.fullName}
              </div>
              <div className="text-[10px] font-semibold text-primary-500 uppercase tracking-wide">
                {user.roles?.join(', ')}
              </div>
            </div>

            <button
              onClick={logout}
              className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition active:scale-95"
              title={t('nav.logout')}
              aria-label={t('nav.logout')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
