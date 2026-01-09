/**
 * File Upload Middleware Module
 * Multer configuration for photo uploads
 */

const multer = require('multer');
const path = require('path');

/**
 * Multer storage configuration
 * Using memory storage for flexibility with database or filesystem storage
 */
const storage = multer.memoryStorage();

/**
 * File filter to accept only images
 * @param {Object} req - Express request object
 * @param {Object} file - Uploaded file object
 * @param {Function} cb - Callback function
 */
function fileFilter(req, file, cb) {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
}

/**
 * Multer upload instance
 * Configured with memory storage and 10MB file size limit
 */
const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

module.exports = upload;
