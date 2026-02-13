const { hasPermission, ROLES, PERMISSIONS } = require('../config/roles');

/**
 * Authorization Middleware
 * Checks if user has required permission(s)
 */

// Check single permission
const authorize = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

// Check any of the permissions
const authorizeAny = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    const hasAny = permissions.some(permission => 
      hasPermission(req.user.role, permission)
    );

    if (!hasAny) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

// Check all permissions
const authorizeAll = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    const hasAll = permissions.every(permission => 
      hasPermission(req.user.role, permission)
    );

    if (!hasAll) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

// Check role directly
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Role not authorized.'
      });
    }

    next();
  };
};

// Distributor only
const distributorOnly = authorizeRoles(ROLES.DISTRIBUTOR);

// Distributor and Computer Operator
const officeAccess = authorizeRoles(ROLES.DISTRIBUTOR, ROLES.COMPUTER_OPERATOR);

// All internal users (not customers)
const internalAccess = authorizeRoles(
  ROLES.DISTRIBUTOR, 
  ROLES.COMPUTER_OPERATOR, 
  ROLES.ORDER_BOOKER
);

module.exports = {
  authorize,
  authorizeAny,
  authorizeAll,
  authorizeRoles,
  distributorOnly,
  officeAccess,
  internalAccess,
  PERMISSIONS, // Re-export for convenience
  ROLES // Re-export for convenience
};
