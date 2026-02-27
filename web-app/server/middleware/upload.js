/**
 * File Upload Middleware Module
 * Multer configuration for photo uploads (memory storage → Cloudinary)
 *
 * Validation:
 *   - Allowed types : JPG / JPEG / PNG / WEBP
 *   - Max size      : 2 MB  (enforced here; also re-validated in cloudinaryService)
 */

const multer = require('multer');
const path = require('path');

/**
 * Memory storage — buffers are handed off to Cloudinary; nothing hits disk.
 */
const storage = multer.memoryStorage();

/** Allowed MIME types (must match cloudinaryService.ALLOWED_MIME_TYPES) */
const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

/**
 * File filter — reject any non-image or disallowed format early.
 */
function fileFilter(req, file, cb) {
  const extOk = /\.(jpe?g|png|webp)$/i.test(path.extname(file.originalname));
  const mimeOk = ALLOWED_MIME.has(file.mimetype);

  if (mimeOk && extOk) {
    return cb(null, true);
  }
  cb(new Error('Invalid file type. Allowed formats: JPG, PNG, WEBP'));
}

/**
 * Multer instance — 2 MB hard cap, memory storage, image-only filter.
 */
const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2 MB
  },
  fileFilter
});

module.exports = upload;

