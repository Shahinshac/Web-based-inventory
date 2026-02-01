/**
 * Users Routes Module
 * Handles authentication, user management, and profile photos
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { ObjectId } = require('mongodb');
const { getDB } = require('../db');
const logger = require('../logger');
const { validateUserRegistration } = require('../validators');
const upload = require('../middleware/upload');
const { logAudit } = require('../services/auditService');
const { savePhotoToDatabase, getPhotoFromDatabase, deletePhotoFromDatabase, deletePhotoFile, ensureUploadDir } = require('../services/photoService');
const { sanitizeObject } = require('../services/helpers');
const { ALLOW_ADMIN_PASSWORD_CHANGE } = require('../config/constants');

/**
 * POST /api/users/register
 * Register new user (Direct - No OTP Required)
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    
    // Validate user registration data
    const userData = { username, password, email };
    const validationErrors = validateUserRegistration(userData);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors.join(', ') });
    }
    
    const db = getDB();
    
    // Check if username already exists
    const existingUser = await db.collection('users').findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = {
      username: sanitizeObject(username.toLowerCase()),
      password: hashedPassword,
      email: sanitizeObject(email.toLowerCase()),
      role: 'user',
      approved: false,
      createdAt: new Date(),
      lastLogin: null,
      sessionVersion: 1
    };
    
    const result = await db.collection('users').insertOne(user);
    
    res.json({
      success: true,
      message: 'Registration successful! Please wait for admin approval.',
      user: {
        id: result.insertedId.toString(),
        username: user.username,
        email: user.email,
        approved: user.approved
      }
    });
  } catch (e) {
    logger.error('Registration error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/users/login
 * User login with password verification
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const db = getDB();
    
    // Find user
    const user = await db.collection('users').findOne({ username: username.toLowerCase() });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Check if approved
    if (!user.approved) {
      return res.status(403).json({ 
        error: 'Your account is pending admin approval',
        approved: false
      });
    }
    
    // Update last login
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    );
    
    res.json({
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        approved: user.approved,
        sessionVersion: user.sessionVersion || 1,
        photo: user.photo ? `/api/users/${user._id.toString()}/photo` : null
      }
    });
  } catch (e) {
    logger.error('Login error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/users/logout
 * User logout (placeholder for client-side session clearing)
 */
router.post('/logout', async (req, res) => {
  try {
    // In a full JWT implementation, you would invalidate the token here
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (e) {
    logger.error('Logout error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/users/session
 * Check session validity (placeholder)
 */
router.get('/session', async (req, res) => {
  try {
    // This would verify JWT token in production
    res.json({ valid: true });
  } catch (e) {
    logger.error('Session check error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/users
 * Get all users (Admin Only)
 */
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    
    const users = await db.collection('users')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    
    const formatted = users.map(u => ({
      _id: u._id.toString(),
      username: u.username,
      email: u.email,
      role: u.role,
      photo: u.photo ? `/api/users/${u._id.toString()}/photo` : null,
      approved: u.approved,
      sessionVersion: u.sessionVersion || 1,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin
    }));
    
    res.json(formatted);
  } catch (e) {
    logger.error('Get users error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/users/check/:id
 * Check if user account still exists and is approved
 */
router.get('/check/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();
    
    const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
    
    if (!user) {
      return res.json({ 
        exists: false, 
        approved: false,
        message: 'User account not found'
      });
    }
    
    res.json({ 
      exists: true, 
      approved: user.approved,
      username: user.username
    });
  } catch (e) {
    logger.error('Check user error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/users/:username/session
 * Get a user's current sessionVersion
 */
router.get('/:username/session', async (req, res) => {
  try {
    const { username } = req.params;
    const db = getDB();
    const user = await db.collection('users').findOne({ username: username.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ username: user.username, sessionVersion: user.sessionVersion || 1 });
  } catch (e) {
    logger.error('Error fetching user sessionVersion:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * PATCH /api/users/:id/approve
 * Approve user with role assignment (Admin Only)
 */
router.patch('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const db = getDB();
    
    // Validate role if provided
    const validRoles = ['admin', 'manager', 'cashier'];
    const assignedRole = role && validRoles.includes(role) ? role : 'cashier';
    
    await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: { approved: true, role: assignedRole } }
    );
    
    logger.info(`User ${id} approved with role: ${assignedRole}`);
    res.json({ success: true, message: `User approved as ${assignedRole}`, role: assignedRole });
  } catch (e) {
    logger.error('Approve user error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * PATCH /api/users/:id/unapprove
 * Unapprove user (Admin Only) - Revoke access without deleting
 */
router.patch('/:id/unapprove', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();
    
    await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: { approved: false } }
    );
    
    res.json({ success: true, message: 'User access revoked successfully' });
  } catch (e) {
    logger.error('Unapprove user error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * PATCH /api/users/:id/role
 * Change user role (Admin Only)
 */
router.patch('/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const db = getDB();
    
    // Validate role
    const validRoles = ['admin', 'manager', 'cashier'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, manager, or cashier.' });
    }
    
    // Update user role
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: { role: role } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    logger.info(`User role updated: ${id} -> ${role}`);
    res.json({ success: true, message: 'User role updated successfully', role: role });
  } catch (e) {
    logger.error('Change user role error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * DELETE /api/users/:id
 * Delete user (Admin Only)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();
    
    // Get user info before deleting
    const userToDelete = await db.collection('users').findOne({ _id: new ObjectId(id) });
    
    if (!userToDelete) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await db.collection('users').deleteOne({ _id: new ObjectId(id) });
    
    res.json({ 
      success: true, 
      message: 'User deleted successfully',
      deletedUserId: id,
      deletedUsername: userToDelete.username
    });
  } catch (e) {
    logger.error('Delete user error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * PATCH /api/users/change-password
 * Change user password (requires current password)
 */
router.patch('/change-password', async (req, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;
    
    if (!username || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Username, current password, and new password are required' });
    }
    
    const db = getDB();
    const user = await db.collection('users').findOne({ username: username.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify current password
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Current password incorrect' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password and increment session version
    await db.collection('users').updateOne(
      { _id: user._id },
      { 
        $set: { password: hashedPassword },
        $inc: { sessionVersion: 1 }
      }
    );
    
    await logAudit(db, 'USER_PASSWORD_CHANGED', user._id.toString(), user.username, {});
    
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (e) {
    logger.error('Change password error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/users/:id/photo
 * Upload user profile photo
 */
router.post('/:id/photo', upload.single('photo'), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, username } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' });
    }

    const db = getDB();
    const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete previous photo record if exists
    if (user.photo) {
      try {
        if (user.photoStorage === 'db' || user.photoDbId) {
          const photoId = user.photoDbId || String(user.photo).replace(/^db:/, '');
          if (photoId) await deletePhotoFromDatabase(db, 'user_images', photoId);
        } else {
          const filename = user.photoFilename || (user.photo && path.basename(user.photo));
          if (filename) await deletePhotoFile(path.join(__dirname, '..', 'uploads', 'users', filename));
        }
      } catch (err) { 
        logger.warn('Failed to delete old user photo:', err.message); 
      }
    }

    // Ensure upload dir exists
    await ensureUploadDir(path.join(__dirname, '..', 'uploads', 'users'));

    // Store relative photo URL with timestamp for cache-busting
    // This ensures browser cache is invalidated when photo is updated
    const photoTimestamp = Date.now();
    let photoUrl = `/api/users/${id}/photo?t=${photoTimestamp}`;
    
    const storageMode = String(req.query.storage || '').toLowerCase();
    const useDbStorage = (storageMode !== 'fs'); // default to DB
    
    if (useDbStorage) {
      const photoId = await savePhotoToDatabase(
        db,
        'user_images',
        id,
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname || req.file.filename
      );

      await db.collection('users').updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            photo: photoUrl, 
            photoStorage: 'db', 
            photoDbId: photoId,
            photoUpdatedAt: new Date(),
            lastModified: new Date(), 
            lastModifiedBy: userId || null, 
            lastModifiedByUsername: username || 'Unknown' 
          } 
        }
      );
    } else {
      // Filesystem-backed
      const filename = `${id}-${Date.now()}${path.extname(req.file.originalname)}`;
      const filePath = path.join(__dirname, '..', 'uploads', 'users', filename);
      await fs.writeFile(filePath, req.file.buffer);
      
      await db.collection('users').updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            photo: photoUrl, 
            photoStorage: 'fs', 
            photoFilename: filename,
            photoUpdatedAt: new Date(),
            lastModified: new Date(), 
            lastModifiedBy: userId || null, 
            lastModifiedByUsername: username || 'Unknown' 
          } 
        }
      );
    }

    await logAudit(db, 'USER_PHOTO_UPDATED', userId || null, username || 'system', { 
      userId: id 
    });

    res.json({ success: true, photo: photoUrl, message: 'User photo uploaded' });
  } catch (e) {
    logger.error('User photo upload error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/users/:id/photo
 * Serve user profile photo
 * Note: Query parameter ?t= is used for cache-busting and is ignored
 */
router.get('/:id/photo', async (req, res) => {
  try {
    const { id } = req.params;
    // Ignore ?t= timestamp parameter - it's only for cache-busting
    const db = getDB();
    const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
    
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.photoStorage === 'db' || user.photoDbId) {
      const imgId = user.photoDbId || String(user.photo || '').replace(/^db:/, '');
      if (!imgId) return res.status(404).json({ error: 'No DB-stored photo' });
      
      const photoData = await getPhotoFromDatabase(db, 'user_images', imgId);
      if (!photoData) return res.status(404).json({ error: 'Image not found' });
      
      res.setHeader('Content-Type', photoData.contentType);
      // Cache for 24 hours - timestamp in URL ensures cache invalidation on update
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(photoData.data);
    }

    const filename = user.photoFilename || (user.photo && path.basename(user.photo));
    if (!filename) return res.status(404).json({ error: 'No photo available' });
    
    const imgPath = path.join(__dirname, '..', 'uploads', 'users', filename);
    return res.sendFile(imgPath, err => {
      if (err) { 
        logger.warn('Failed to send user photo:', err.message); 
        res.status(404).json({ error: 'Image not found' }); 
      }
    });
  } catch (e) {
    logger.error('Serve user photo error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * DELETE /api/users/:id/photo
 * Delete user profile photo
 */
router.delete('/:id/photo', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, username } = req.query;
    const db = getDB();

    const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.photo) {
      if (String(user.photo).startsWith('db:') || user.photoDbId) {
        const photoId = user.photoDbId || String(user.photo).replace(/^db:/, '');
        if (photoId) await deletePhotoFromDatabase(db, 'user_images', photoId);
      } else {
        try { 
          await deletePhotoFile(path.join(__dirname, '..', 'uploads', 'users', path.basename(user.photo))); 
        } catch (err) { 
          logger.warn('Failed to delete user photo file:', err.message); 
        }
      }
    }

    await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          photo: null, 
          lastModified: new Date(), 
          lastModifiedBy: userId || null, 
          lastModifiedByUsername: username || 'Unknown' 
        }, 
        $unset: { 
          photoFilename: '', 
          photoDbId: '', 
          photoStorage: '' 
        } 
      }
    );

    await logAudit(db, 'USER_PHOTO_DELETED', userId || null, username || 'system', { userId: id });

    res.json({ success: true, message: 'User photo deleted' });
  } catch (e) {
    logger.error('Delete user photo error:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
