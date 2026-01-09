/**
 * Application Constants Module
 * Centralized configuration and environment variables
 */

/**
 * JWT Secret for session management
 * @type {string}
 */
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

/**
 * Company Information
 */
const COMPANY_NAME = process.env.COMPANY_NAME || 'My Shop';
const COMPANY_PHONE = process.env.COMPANY_PHONE || '7594012761';
const COMPANY_ADDRESS = process.env.COMPANY_ADDRESS || '';
const COMPANY_EMAIL = process.env.COMPANY_EMAIL || '';
const COMPANY_GSTIN = process.env.COMPANY_GSTIN || '';

/**
 * Session Configuration
 * @type {number} Timeout in milliseconds
 */
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Admin Password Change Setting
 * Guard: admin password changes via the web API are disabled by default.
 * Set ALLOW_ADMIN_PASSWORD_CHANGE=true in the server environment to enable.
 */
const ALLOW_ADMIN_PASSWORD_CHANGE = process.env.ALLOW_ADMIN_PASSWORD_CHANGE === 'true';

/**
 * Public Base URL for generating links
 */
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || '';

/**
 * Admin Credentials
 */
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

/**
 * Server Port
 */
const PORT = process.env.PORT || 4000;

/**
 * Environment
 */
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * CORS Origin (frontend URL)
 */
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

module.exports = {
  JWT_SECRET,
  COMPANY_NAME,
  COMPANY_PHONE,
  COMPANY_ADDRESS,
  COMPANY_EMAIL,
  COMPANY_GSTIN,
  SESSION_TIMEOUT,
  ALLOW_ADMIN_PASSWORD_CHANGE,
  PUBLIC_BASE_URL,
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
  PORT,
  NODE_ENV,
  CORS_ORIGIN
};
