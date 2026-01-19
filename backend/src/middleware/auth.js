// ========================================================================
// AUTHENTICATION MIDDLEWARE
// Validates JWT token and extracts user context
// ========================================================================

import { extractToken, verifyToken } from '../utils/jwt.js';

/**
 * Middleware: Verify JWT token from Authorization header
 * Sets req.user if token is valid
 */
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = extractToken(authHeader);

  if (!token) {
    return res.status(401).json({
      error: 'No token provided',
      message: 'Missing or invalid Authorization header',
    });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({
      error: 'Invalid token',
      message: 'Token is expired or malformed',
    });
  }

  // Attach user info to request
  req.user = {
    userId: payload.userId,
    email: payload.email,
    roles: payload.roles || [], // Array of { companyId, role }
  };

  next();
}

/**
 * Middleware: Require specific role in a company context
 * @param {string} requiredRole - Role required (COMPANY_ADMIN, EDITOR, VIEWER, INTERNAL_ADMIN)
 * @returns {Function} Middleware function
 */
export function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // INTERNAL_ADMIN can access everything
    // Check if user has internal_admin role in any of their roles
    const isInternalAdmin = req.user.roles.some(r => r.role === 'internal_admin');
    if (isInternalAdmin) {
      return next();
    }

    // Get company ID from params or body
    const companyId = req.params.companyId || req.body.companyId;

    if (!companyId) {
      return res.status(400).json({
        error: 'Missing company context',
        message: 'companyId required in URL or body',
      });
    }

    // Find role for this specific company
    const userRoleObj = req.user.roles.find(r => r.companyId === companyId);
    const userRoleInCompany = userRoleObj ? userRoleObj.role : null;

    if (!userRoleInCompany) {
      return res.status(403).json({
        error: 'Access denied',
        message: `User has no role in company ${companyId}`,
      });
    }

    // Check role hierarchy (lowercase)
    const roleHierarchy = {
      viewer: 1,
      editor: 2,
      company_admin: 3,
      internal_admin: 4,
    };

    // Ensure requiredRole is lowercase for comparison
    const requiredRoleLower = requiredRole.toLowerCase();

    if (roleHierarchy[userRoleInCompany] < roleHierarchy[requiredRoleLower]) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Required role: ${requiredRoleLower}, but user is ${userRoleInCompany}`,
      });
    }

    // Store the company context
    req.companyId = companyId;
    req.userRole = userRoleInCompany;

    next();
  };
}

/**
 * Middleware: Ensure user is INTERNAL_ADMIN
 */
export function requireInternalAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const isInternalAdmin = req.user.roles.some(r => r.role === 'internal_admin');

  if (!isInternalAdmin) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'This endpoint requires Internal Admin role',
    });
  }

  next();
}
