/**
 * Logger Module
 * Centralized logging system using Winston
 * Provides console and file logging with different levels
 */

const winston = require('winston');
const path = require('path');

// Log level definitions with priority
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Color scheme for console output
const LOG_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

// Apply colors to Winston
winston.addColors(LOG_COLORS);

// Timestamp format for logs
const TIMESTAMP_FORMAT = 'YYYY-MM-DD HH:mm:ss';

/**
 * Create JSON format for file logging
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: TIMESTAMP_FORMAT }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

/**
 * Create colored format for console output
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: TIMESTAMP_FORMAT }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    const stackTrace = stack ? `\n${stack}` : '';
    return `${timestamp} ${level}: ${message}${stackTrace}`;
  })
);

/**
 * Define log file paths
 */
const LOG_DIR = path.join(__dirname, 'logs');
const ERROR_LOG_PATH = path.join(LOG_DIR, 'error.log');
const COMBINED_LOG_PATH = path.join(LOG_DIR, 'combined.log');

/**
 * Configure transport layers
 */
const transports = [
  // Console transport with colors
  new winston.transports.Console({
    format: consoleFormat
  }),
  // Error-only file transport
  new winston.transports.File({
    filename: ERROR_LOG_PATH,
    level: 'error',
    format: fileFormat
  }),
  // All logs file transport
  new winston.transports.File({
    filename: COMBINED_LOG_PATH,
    format: fileFormat
  })
];

/**
 * Create the logger instance
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: LOG_LEVELS,
  transports,
  exitOnError: false
});

/**
 * HTTP Request Logging Middleware
 * Logs all incoming HTTP requests with response status and duration
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
logger.httpLogger = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logMessage = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`;

    // Log based on status code
    if (res.statusCode >= 500) {
      logger.error(logMessage);
    } else if (res.statusCode >= 400) {
      logger.warn(logMessage);
    } else {
      logger.http(logMessage);
    }
  });

  next();
};

module.exports = logger;
