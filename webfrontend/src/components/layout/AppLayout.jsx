import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { SERVER_BASE_URL } from '../../services/api';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [backendConnected, setBackendConnected] = useState(true);

  // Check backend server liveness
  useEffect(() => {
    const checkBackend = () => {
      fetch(`${SERVER_BASE_URL || ''}/`)
        .then((res) => res.text())
        .then(() => setBackendConnected(true))
        .catch(() => setBackendConnected(false));
    };

    checkBackend();
    const interval = setInterval(checkBackend, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row antialiased">
      {/* Sidebar (Desktop sticky / Mobile drawer) */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header 
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)} 
          backendConnected={backendConnected}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
