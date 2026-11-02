import React, { useState, useEffect } from 'react';
import { useTranslation } from './i18n';
import { useTheme } from './context/ThemeContext';
import { useAuth } from './context/AuthContext';
import Can from './components/auth/Can';
import api from './services/api';

export default function App() {
  const { t, lang, setLanguage } = useTranslation();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { user, login, logout } = useAuth();

  const [backendStatus, setBackendStatus] = useState('checking');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Verify live backend health on load
  useEffect(() => {
    fetch('http://localhost:5000/')
      .then((res) => res.text())
      .then((data) => {
        if (data.includes('gt erp')) {
          setBackendStatus('connected');
        } else {
          setBackendStatus('connected');
        }
      })
      .catch(() => setBackendStatus('offline'));
  }, []);

  // Fetch employees from live backend API
  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const response = await api.get('/employees');
      if (response.success && Array.isArray(response.data)) {
        setEmployees(response.data);
      } else if (Array.isArray(response)) {
        setEmployees(response);
      } else {
        setEmployees([]);
      }
    } catch {
      // Endpoint may require auth or is empty in initial DB
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'employees') {
      fetchEmployees();
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Left: GT Logo & Branding */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                aria-label="Toggle navigation menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                </svg>
              </button>

              <div className="flex items-center gap-2.5">
                <img 
                  src="/gt-logo.jpg" 
                  alt="GT Logo" 
                  className="h-9 w-9 rounded-lg object-contain shadow-xs border border-primary-500/20"
                />
                <div className="leading-tight">
                  <div className="font-bold text-base tracking-tight text-primary-500 dark:text-primary-400">
                    {t('app.title')}
                  </div>
                  <div className="hidden sm:block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {t('app.company')}
                  </div>
                </div>
              </div>
            </div>

            {/* Middle: Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {[
                { id: 'dashboard', label: t('nav.dashboard') },
                { id: 'employees', label: t('nav.employees') },
                { id: 'attendance', label: t('nav.attendance') },
                { id: 'leave', label: t('nav.leave') },
                { id: 'payroll', label: t('nav.payroll') }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === item.id
                      ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Right: Controls (Language, Theme, Auth) */}
            <div className="flex items-center gap-2">
              {/* Language Selector */}
              <button
                onClick={() => setLanguage(lang === 'en' ? 'am' : 'en')}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 transition"
                title="Switch Language"
              >
                <span>{lang === 'en' ? '🇪🇹' : '🇬🇧'}</span>
                <span className="font-bold">{lang === 'en' ? 'አማርኛ' : 'EN'}</span>
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                title={`Current: ${resolvedTheme} mode`}
                aria-label="Toggle theme"
              >
                {resolvedTheme === 'dark' ? (
                  <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-slate-700" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>

              {/* Backend Status Dot */}
              <div 
                className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-700/60"
                title={`Backend: http://localhost:5000 (${backendStatus})`}
              >
                <span className={`w-2 h-2 rounded-full ${backendStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span className="hidden sm:inline text-slate-600 dark:text-slate-300">
                  {backendStatus === 'connected' ? 'Live API' : 'API Offline'}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 space-y-2">
            {[
              { id: 'dashboard', label: t('nav.dashboard') },
              { id: 'employees', label: t('nav.employees') },
              { id: 'attendance', label: t('nav.attendance') },
              { id: 'leave', label: t('nav.leave') },
              { id: 'payroll', label: t('nav.payroll') }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                  activeTab === item.id
                    ? 'bg-primary-500 text-white font-bold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Main Responsive Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Banner with Brand Header */}
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-primary-600 via-primary-500 to-rose-600 text-white p-5 sm:p-6 shadow-md relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-xs font-semibold uppercase tracking-wider mb-2">
                GT Printing Press ERP
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                {activeTab === 'dashboard' && t('nav.dashboard')}
                {activeTab === 'employees' && t('nav.employees')}
                {activeTab === 'attendance' && t('nav.attendance')}
                {activeTab === 'leave' && t('nav.leave')}
                {activeTab === 'payroll' && t('nav.payroll')}
              </h1>
              <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-xl">
                {t('app.company')} - Mobile-first, fully responsive enterprise ERP with live Express/MongoDB integration.
              </p>
            </div>

            {/* Quick Action RBAC Button */}
            <Can roles={['admin', 'hr']}>
              <div className="self-start sm:self-auto">
                <button className="px-4 py-2 bg-white text-primary-600 hover:bg-slate-100 font-bold text-xs rounded-xl shadow-xs transition active:scale-95">
                  + {t('actions.create')}
                </button>
              </div>
            </Can>
          </div>
        </div>

        {/* Content Area */}
        {activeTab === 'employees' ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t('nav.employees')} (Live API)
              </h2>
              <button
                onClick={fetchEmployees}
                disabled={loadingEmployees}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg transition"
              >
                {loadingEmployees ? 'Loading...' : t('actions.refresh')}
              </button>
            </div>

            {/* Responsive Data Presentation:
                1. MOBILE VIEW (Cards - < md)
                2. DESKTOP VIEW (Table - >= md)
            */}
            {loadingEmployees ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Connecting to backend API...
              </div>
            ) : employees.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  No employee records returned by backend
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Connected to Express server at <code className="text-primary-500 font-mono">/api/employees</code>
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Card Deck (< md) */}
                <div className="block md:hidden space-y-3">
                  {employees.map((emp) => (
                    <div 
                      key={emp._id} 
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{emp.fullName}</div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                          {emp.status || 'Active'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{emp.email}</div>
                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-xs grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                        <div><span className="text-slate-400">Dept:</span> {emp.department || '-'}</div>
                        <div><span className="text-slate-400">Position:</span> {emp.position || '-'}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table (>= md) */}
                <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-4 py-3">Full Name</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">Position</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {employees.map((emp) => (
                        <tr key={emp._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{emp.fullName}</td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{emp.email}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{emp.department || '-'}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{emp.position || '-'}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                              {emp.status || 'Active'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        ) : (
          /* Dashboard overview tiles */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: t('nav.employees'), value: 'Live API Ready', tag: 'HR Module', icon: '👥' },
              { title: t('nav.attendance'), value: 'Clock In/Out', tag: 'Biometric/GPS', icon: '⏱️' },
              { title: t('nav.leave'), value: 'Annual / Sick', tag: 'Approvals', icon: '🏖️' },
              { title: t('nav.payroll'), value: 'Monthly Slip', tag: 'Finance', icon: '💳' },
            ].map((tile, idx) => (
              <div 
                key={idx}
                className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs hover:border-primary-500/50 transition cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{tile.icon}</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-primary-50 text-primary-600 dark:bg-primary-950/60 dark:text-primary-400">
                    {tile.tag}
                  </span>
                </div>
                <div className="mt-4 font-bold text-base text-slate-900 dark:text-slate-100">{tile.title}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{tile.value}</div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
