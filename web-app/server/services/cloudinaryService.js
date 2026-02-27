/**
 * Cloudinary Service
 * ---------------------------------------------------------------------------
 * Centralises all Cloudinary interactions so every route can upload /
 * delete images without duplicating SDK config or stream wiring.
 *
 * Environment variables required (add to .env / Render dashboard):
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 *
 * Images are stored under structured folders:
 *   inventory/users/<userId>   – user profile photos (one per user, overwritten)
 *   inventory/products/<productId> – product images (multiple, unique IDs)
 * ---------------------------------------------------------------------------
 */

const cloudinary = require('cloudinary').v2;
const logger = require('../logger');

// ---------------------------------------------------------------------------
// SDK configuration (runs once at module load)
// ---------------------------------------------------------------------------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true // Always use HTTPS for all generated URLs
});

// Log configuration status at startup
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  logger.info(`Cloudinary configured ✓  (cloud: ${process.env.CLOUDINARY_CLOUD_NAME})`);
} else {
  logger.warn('Cloudinary NOT configured — image uploads will be disabled. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.');
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/** Allowed MIME types for upload */
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

/** Max file size: 2 MB */
const MAX_FILE_SIZE = 2 * 1024 * 1024;

/**
 * Validate a file before sending to Cloudinary.
 * @param {Express.Multer.File} file – multer file object in memory
 * @throws {Error} with a user-friendly message on failure
 */
function validateFile(file) {
  if (!file || !file.buffer) {
    throw new Error('No file data received');
  }
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new Error('Invalid file type. Allowed: JPG, PNG, WEBP');
  }
  if (file.buffer.length > MAX_FILE_SIZE) {
    throw new Error('File too large. Maximum size is 2 MB');
  }
}

// ---------------------------------------------------------------------------
// Core upload function
// ---------------------------------------------------------------------------

/**
 * Upload an image buffer to Cloudinary and return the CDN metadata.
 *
 * @param {Buffer}  buffer   – file buffer from multer memoryStorage
 * @param {string}  mimetype – MIME type string (e.g. 'image/jpeg')
 * @param {Object}  opts
 * @param {string}  opts.folder       – Cloudinary folder path
 * @param {string}  [opts.publicId]   – explicit public_id (useful for overwrite-on-update)
 * @param {boolean} [opts.overwrite]  – overwrite existing asset (default true)
 * @param {number}  [opts.width]      – max width for resize (default 800)
 * @param {number}  [opts.height]     – max height for resize (default 800)
 *
 * @returns {Promise<{url: string, publicId: string, width: number, height: number, bytes: number, format: string}>}
 */
function uploadBuffer(buffer, mimetype, opts = {}) {
  return new Promise((resolve, reject) => {
    // Guard: ensure SDK is configured before attempting upload
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return reject(new Error('Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.'));
    }

    const uploadOptions = {
      folder:        opts.folder || 'inventory/misc',
      resource_type: 'image',
      overwrite:     opts.overwrite !== false, // default true
      // Auto-format & auto-quality → Cloudinary picks optimal format (WebP on supporting browsers)
      transformation: [
        {
          width:       opts.width  || 800,
          height:      opts.height || 800,
          crop:        'limit',       // never upscale
          quality:     'auto:good',
          fetch_format:'auto'
        }
      ]
    };

    if (opts.publicId) {
      uploadOptions.public_id = opts.publicId;
    }

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        logger.error('Cloudinary upload error:', error.message);
        return reject(new Error(`Cloudinary upload failed: ${error.message}`));
      }
      resolve({
        url:      result.secure_url,
        publicId: result.public_id,
        width:    result.width,
        height:   result.height,
        bytes:    result.bytes,
        format:   result.format
      });
    });

    stream.end(buffer);
  });
}

// ---------------------------------------------------------------------------
// Domain-specific wrappers
// ---------------------------------------------------------------------------

/**
 * Upload a user profile photo.
 * Uses a deterministic public_id so each new upload overwrites the old one
 * on Cloudinary, keeping storage tidy without a separate delete call.
 *
 * @param {Buffer}  buffer
 * @param {string}  mimetype
 * @param {string}  userId   – MongoDB user _id string
 */
async function uploadUserPhoto(buffer, mimetype, userId) {
  validateFile({ buffer, mimetype });
  return uploadBuffer(buffer, mimetype, {
    folder:    'inventory/users',
    publicId:  userId,  // folder + publicId → inventory/users/{userId}
    overwrite: true,
    width:     400,
    height:    400
  });
}

/**
 * Upload a product image.
 * Each upload gets a unique timestamp-based public_id so multiple images
 * can exist for one product.
 *
 * @param {Buffer}  buffer
 * @param {string}  mimetype
 * @param {string}  productId – MongoDB product _id string
 */
async function uploadProductPhoto(buffer, mimetype, productId) {
  validateFile({ buffer, mimetype });
  // Unique ID per image → allows multiple photos per product
  const uniqueId = `${productId}-${Date.now()}`;
  return uploadBuffer(buffer, mimetype, {
    folder:    'inventory/products',
    publicId:  uniqueId,  // folder + publicId → inventory/products/{uniqueId}
    overwrite: false,
    width:     800,
    height:    800
  });
}

// ---------------------------------------------------------------------------
// Delete helper
// ---------------------------------------------------------------------------

/**
 * Delete an image from Cloudinary by its public_id.
 * Non-fatal: errors are logged but never thrown (deletion failure should not
 * block the API response).
 *
 * @param {string} publicId – Cloudinary public_id
 * @returns {Promise<void>}
 */
async function deleteCloudinaryAsset(publicId) {
  if (!publicId) return;
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result !== 'ok' && result.result !== 'not found') {
      logger.warn(`Cloudinary delete returned unexpected result for "${publicId}":`, result);
    }
  } catch (err) {
    logger.warn(`Failed to delete Cloudinary asset "${publicId}":`, err.message);
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Returns true when all three required env vars are present.
 * Use this at startup to warn operators about missing config.
 */
function isConfigured() {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

/**
 * Generate a resized/transformed URL from an existing Cloudinary public_id.
 * Useful for building thumbnail variants from a stored full-size image.
 *
 * @param {string} publicId
 * @param {Object} [transforms]
 * @returns {string} Cloudinary CDN URL
 */
function getTransformedUrl(publicId, transforms = {}) {
  return cloudinary.url(publicId, {
    secure:       true,
    quality:      'auto',
    fetch_format: 'auto',
    ...transforms
  });
}

module.exports = {
  validateFile,
  uploadBuffer,
  uploadUserPhoto,
  uploadProductPhoto,
  deleteCloudinaryAsset,
  isConfigured,
  getTransformedUrl,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES
};
