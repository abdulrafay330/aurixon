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
 * @param {array|string} requiredRoles - Role(s) required (can be array or string)
 * @returns {Function} Middleware function
 */
export function requireRole(requiredRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Normalize to array
    const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

    // Get company ID from params
    const companyId = req.params.companyId;

    if (!companyId) {
      return res.status(400).json({
        error: 'Missing company context',
        message: 'companyId required in URL',
      });
    }

    // req.user.roles is an array: [{ companyId, role }, ...]
    const userCompanyRole = req.user.roles.find(r => r.companyId === companyId);

    if (!userCompanyRole) {
      return res.status(403).json({
        error: 'Access denied',
        message: `User has no role in company ${companyId}`,
      });
    }

    // Check role hierarchy (lowercase)
    const roleHierarchy = {
      'viewer': 1,
      'editor': 2,
      'company_admin': 3,
      'internal_admin': 4,
    };

    // If rolesArray is just a list of allowed roles, check if user's role is in that list
    // If rolesArray has one element, enforce hierarchy (editor+ means editor, company_admin, internal_admin)
    const userRoleLower = userCompanyRole.role.toLowerCase();
    
    if (rolesArray.length === 1) {
      // Single role requirement - enforce hierarchy
      const requiredLevel = roleHierarchy[rolesArray[0].toLowerCase()] || 0;
      const userRoleLevel = roleHierarchy[userRoleLower] || 0;
      
      if (userRoleLevel < requiredLevel) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: `Required role: ${rolesArray[0]}, but user is ${userCompanyRole.role}`,
        });
      }
    } else {
      // Multiple roles - check if user's role is in the list
      const normalizedRoles = rolesArray.map(r => r.toLowerCase());
      if (!normalizedRoles.includes(userRoleLower)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: `Required role: ${rolesArray.join(' or ')}, but user is ${userCompanyRole.role}`,
        });
      }
    }

    // Store the company context
    req.companyId = companyId;
    req.userRole = userCompanyRole.role;

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

  if (!req.user.roles.INTERNAL_ADMIN) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'This endpoint requires Internal Admin role',
    });
  }

  next();
}
