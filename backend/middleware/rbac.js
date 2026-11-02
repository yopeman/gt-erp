/**
 * Role-Based Access Control (RBAC) middleware
 * @param  {...string} roles Allowed roles (e.g., 'admin', 'hr', 'manager')
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRoles = req.user.roles || [];

    // 'admin' role has universal access
    if (userRoles.includes('admin')) {
      return next();
    }

    const hasPermission = roles.some((role) => userRoles.includes(role));

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Requires one of the following roles: [${roles.join(', ')}]`
      });
    }

    next();
  };
};

export default {
  authorizeRoles
};

