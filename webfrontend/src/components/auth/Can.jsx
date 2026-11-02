import React from 'react';
import { useAuth } from '../../context/AuthContext';

/**
 * RBAC Helper Component
 * Renders children only if current logged-in user possesses one of the allowed roles.
 * Admins have universal permission.
 *
 * @param {string | string[]} roles Allowed role(s) e.g., 'admin', ['admin', 'hr']
 * @param {React.ReactNode} fallback Component to display if unauthorized
 */
export default function Can({ roles = [], children, fallback = null }) {
  const { hasRole } = useAuth();

  if (hasRole(roles)) {
    return <>{children}</>;
  }

  return fallback;
}
