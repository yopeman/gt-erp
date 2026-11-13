import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children, roles = [] }) {
  const { user, token, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-xs font-semibold text-slate-500 animate-pulse">
          Validating session...
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (roles.length > 0 && !hasRole(roles)) {
    return (
      <div className="p-8 text-center">
        <div className="p-6 max-w-md mx-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xl font-bold text-rose-500">Access Restricted</div>
          <p className="text-xs text-slate-500 mt-2">
            Your assigned role(s) [{user.roles?.join(', ')}] do not have authorization to view this section.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
