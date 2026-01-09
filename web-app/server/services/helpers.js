/**
 * Helper Utilities Module
 * Common helper functions for data sanitization and manipulation
 */

/**
 * Sanitize string input to remove dangerous characters
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').trim();
}

/**
 * Sanitize object (wrapper for sanitizeString for backwards compatibility)
 * @param {any} obj - Object to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeObject(obj) {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  if (typeof obj === 'object' && obj !== null) {
    return JSON.stringify(obj);
  }
  return String(obj);
}

module.exports = {
  sanitizeString,
  sanitizeObject
};
