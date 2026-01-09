/**
 * Error Handler Middleware Module
 * Centralized error handling for Express application
 */

const logger = require('../logger');

/**
 * 404 Not Found Handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function notFoundHandler(req, res) {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    path: req.path
  });
}

/**
 * Global Error Handler
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function errorHandler(err, req, res, next) {
  // Log the error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Send error response
  res.status(statusCode).json({
    error: err.name || 'Error',
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      path: req.path 
    })
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};
