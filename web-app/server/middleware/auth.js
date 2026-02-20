/**
 * Authentication Middleware Module
 * Handles JWT token verification and role-based access control
 */

const jwt = require('jsonwebtoken');
const { getDB } = require('../db');
const logger = require('../logger');
const { JWT_SECRET } = require('../config/constants');

/**
 * Verify JWT token and attach decoded user to req.user
 */
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Validate sessionVersion against DB to support forced logout on password change
    const db = getDB();
    const user = await db.collection('users').findOne(
      { username: decoded.username },
      { projection: { sessionVersion: 1, approved: 1, role: 1 } }
    );

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.approved) {
      return res.status(403).json({ error: 'Account is not approved' });
    }

    const dbSessionVersion = user.sessionVersion || 1;
    if (decoded.sessionVersion !== dbSessionVersion) {
      return res.status(401).json({ error: 'Session invalidated — please log in again' });
    }

    req.user = decoded;
    next();
  } catch (e) {
    logger.error('Auth middleware error:', e);
    res.status(500).json({ error: 'Authentication error' });
  }
}

/**
 * Require admin or superadmin role
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/**
 * Require superadmin role
 */
function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
}

module.exports = {
  authenticateToken,
  requireAdmin,
  requireSuperAdmin
};
