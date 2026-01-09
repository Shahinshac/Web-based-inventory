/**
 * Photo Service Module
 * Handles photo storage and retrieval (database and filesystem)
 */

const { ObjectId } = require('mongodb');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../logger');

/**
 * Save photo to database
 * @param {Object} db - MongoDB database instance
 * @param {string} collection - Collection name ('product_images' or 'user_images')
 * @param {string} entityId - Product or User ID
 * @param {Buffer} buffer - File buffer
 * @param {string} mimetype - File MIME type
 * @param {string} filename - Original filename
 * @returns {Promise<string>} Inserted image document ID
 */
async function savePhotoToDatabase(db, collection, entityId, buffer, mimetype, filename) {
  try {
    const imgDoc = {
      [collection === 'product_images' ? 'productId' : 'userId']: new ObjectId(entityId),
      filename: filename,
      contentType: mimetype || 'application/octet-stream',
      data: buffer,
      uploadedAt: new Date()
    };

    const result = await db.collection(collection).insertOne(imgDoc);
    return result.insertedId.toString();
  } catch (error) {
    logger.error('Failed to save photo to database:', error);
    throw error;
  }
}

/**
 * Get photo from database
 * @param {Object} db - MongoDB database instance
 * @param {string} collection - Collection name ('product_images' or 'user_images')
 * @param {string} photoId - Photo document ID
 * @returns {Promise<Object>} Photo document with data and contentType
 */
async function getPhotoFromDatabase(db, collection, photoId) {
  try {
    const imgDoc = await db.collection(collection).findOne({ 
      _id: new ObjectId(photoId) 
    });
    
    if (!imgDoc) {
      return null;
    }

    return {
      data: imgDoc.data.buffer ? Buffer.from(imgDoc.data.buffer) : imgDoc.data,
      contentType: imgDoc.contentType || 'application/octet-stream'
    };
  } catch (error) {
    logger.error('Failed to get photo from database:', error);
    throw error;
  }
}

/**
 * Delete photo from database
 * @param {Object} db - MongoDB database instance
 * @param {string} collection - Collection name ('product_images' or 'user_images')
 * @param {string} photoId - Photo document ID
 * @returns {Promise<boolean>} True if deleted successfully
 */
async function deletePhotoFromDatabase(db, collection, photoId) {
  try {
    const result = await db.collection(collection).deleteOne({ 
      _id: new ObjectId(photoId) 
    });
    return result.deletedCount > 0;
  } catch (error) {
    logger.error('Failed to delete photo from database:', error);
    throw error;
  }
}

/**
 * Delete photo file from filesystem
 * @param {string} filePath - Full path to file
 * @returns {Promise<void>}
 */
async function deletePhotoFile(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    logger.warn('Failed to delete photo file:', error.message);
  }
}

/**
 * Ensure upload directory exists
 * @param {string} dirPath - Directory path
 * @returns {Promise<void>}
 */
async function ensureUploadDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    logger.error('Failed to create upload directory:', error);
    throw error;
  }
}

module.exports = {
  savePhotoToDatabase,
  getPhotoFromDatabase,
  deletePhotoFromDatabase,
  deletePhotoFile,
  ensureUploadDir
};
