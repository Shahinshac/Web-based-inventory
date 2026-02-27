/**
 * Application Constants Module
 * Centralized configuration and environment variables
 */

/**
 * JWT Secret for session management
 * @type {string}
 */
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production';

/**
 * JWT token expiry
 */
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Company Information
 */
const COMPANY_NAME = process.env.COMPANY_NAME || '26:07 Electronics';
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

/**
 * Cloudinary Configuration
 * Required for cloud image storage (user profile photos + product images).
 * Sign up at https://cloudinary.com and add credentials to your .env / hosting env vars.
 *
 *   CLOUDINARY_CLOUD_NAME  – Your Cloudinary cloud name
 *   CLOUDINARY_API_KEY     – API key (from Cloudinary dashboard)
 *   CLOUDINARY_API_SECRET  – API secret (keep private, server-side only)
 */
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_API_KEY    = process.env.CLOUDINARY_API_KEY    || '';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '';

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN,
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
  CORS_ORIGIN,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET
};
