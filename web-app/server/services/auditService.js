/**
 * Audit Service Module
 * Handles audit trail logging for user actions
 */

const { ObjectId } = require('mongodb');
const logger = require('../logger');

/**
 * Log an audit trail entry for user actions
 * @param {Object} db - MongoDB database instance
 * @param {string} action - Action type (e.g., 'PRODUCT_ADDED', 'SALE_COMPLETED')
 * @param {string|null} userId - User ID performing the action
 * @param {string} username - Username performing the action
 * @param {Object} details - Additional details about the action
 * @returns {Promise<void>}
 */
async function logAudit(db, action, userId, username, details = {}) {
  try {
    const auditLog = {
      action,
      userId: userId ? new ObjectId(userId) : null,
      username: username || 'System',
      timestamp: new Date(),
      details,
      ipAddress: null // Can be enhanced to capture IP
    };
    
    await db.collection('audit_logs').insertOne(auditLog);
  } catch (e) {
    logger.error('Audit logging error:', e);
  }
}

module.exports = {
  logAudit
};
