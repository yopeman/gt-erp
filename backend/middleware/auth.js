import { verifyToken } from '../utils/token.js';
import User from '../models/User.js';

/**
 * Protect routes by validating JWT Bearer token in headers
 */
export const protect = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No authorization token provided'
      });
    }

    const decoded = verifyToken(token);

    const user = await User.findById(decoded.id || decoded._id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session: User no longer exists'
      });
    }

    if (user.isDeleted) {
      return res.status(403).json({
        success: false,
        message: 'User account has been deactivated'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or expired token',
      error: error.message
    });
  }
};

/**
 * Optional authentication: Populates req.user if token is present, continues without error if absent
 */
export const optionalAuth = async (req, res, next) => {
  try {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id || decoded._id).select('-password');
      if (user && !user.isDeleted) {
        req.user = user;
      }
    }
  } catch {
    // Continue without setting req.user
  }
  next();
};

export default {
  protect,
  optionalAuth
};

