/**
 * Users Routes Module
 * Handles authentication, user management, and profile photos
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
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
const { uploadUserPhoto, deleteCloudinaryAsset, isConfigured: isCloudinaryConfigured } = require('../services/cloudinaryService');
const { sanitizeObject } = require('../services/helpers');
const { ALLOW_ADMIN_PASSWORD_CHANGE, JWT_SECRET, JWT_EXPIRES_IN } = require('../config/constants');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

/**
 * POST /api/users/register
 * Register new user (Direct - No OTP Required)
 * @deprecated - Use POST /api/users/create (admin-only) instead
 */
router.post('/register', async (req, res) => {
  return res.status(403).json({ error: 'Self-registration is disabled. Please contact your admin to create an account.' });
});

/**
 * POST /api/users/create
 * Create a new user (Admin Only)
 * Admin sets username, password, email, and role directly
 */
router.post('/create', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, password, email, role } = req.body;
    
    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }
    
    const db = getDB();
    
    // Check if username already exists
    const existingUser = await db.collection('users').findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    
    // Validate role
    const validRoles = ['admin', 'manager', 'cashier'];
    const assignedRole = role && validRoles.includes(role) ? role : 'cashier';
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user - directly approved since admin is creating
    const user = {
      username: sanitizeObject(username.toLowerCase()),
      password: hashedPassword,
      email: email ? sanitizeObject(email.toLowerCase()) : '',
      role: assignedRole,
      approved: true,
      createdAt: new Date(),
      createdBy: req.user.username,
      lastLogin: null,
      sessionVersion: 1
    };
    
    const result = await db.collection('users').insertOne(user);
    
    await logAudit(db, 'USER_CREATED_BY_ADMIN', req.user.userId, req.user.username, {
      newUserId: result.insertedId.toString(),
      newUsername: user.username,
      role: assignedRole
    });
    
    logger.info(`Admin ${req.user.username} created user: ${user.username} with role: ${assignedRole}`);
    
    res.json({
      success: true,
      message: `User "${user.username}" created successfully as ${assignedRole}`,
      user: {
        id: result.insertedId.toString(),
        username: user.username,
        email: user.email,
        role: assignedRole,
        approved: true
      }
    });
  } catch (e) {
    logger.error('Create user error:', e);
    res.status(500).json({ error: 'Failed to create user' });
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
    
    // Check if account is active
    if (user.approved === false) {
      return res.status(403).json({ 
        error: 'Your account is disabled. Please contact your admin.',
        approved: false
      });
    }
    
    // Update last login
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    );
    
    // Log the login action
    await logAudit(db, 'USER_LOGIN', user._id.toString(), user.username, {
      role: user.role,
      ip: req.ip || req.connection?.remoteAddress || 'unknown'
    });
    
    const sessionVersion = user.sessionVersion || 1;

    // Issue JWT
    const token = jwt.sign(
      { userId: user._id.toString(), username: user.username, role: user.role, sessionVersion },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        approved: user.approved,
        sessionVersion,
        // Return direct CDN URL for Cloudinary photos; fall back to API proxy for legacy
        photo: user.photo
          ? (user.photoStorage === 'cloudinary' ? user.photo : `/api/users/${user._id.toString()}/photo`)
          : null
      }
    });
  } catch (e) {
    logger.error('Login error:', e);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/users/logout
 * User logout (placeholder for client-side session clearing)
 */
router.post('/logout', async (req, res) => {
  try {
    const db = getDB();
    const { userId, username } = req.body;
    
    // Log the logout action if user info provided
    if (userId && username) {
      await logAudit(db, 'USER_LOGOUT', userId, username, {
        ip: req.ip || req.connection?.remoteAddress || 'unknown'
      });
    }
    
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (e) {
    logger.error('Logout error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/users/session
 * Verify JWT and return session validity
 */
router.get('/session', authenticateToken, async (req, res) => {
  try {
    res.json({ valid: true, user: req.user });
  } catch (e) {
    logger.error('Session check error:', e);
    res.status(500).json({ error: 'Session check failed' });
  }
});

/**
 * GET /api/users
 * Get all users (Admin Only)
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getDB();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 200), 500);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      db.collection('users').find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      db.collection('users').countDocuments()
    ]);
    
    const formatted = users.map(u => ({
      _id: u._id.toString(),
      username: u.username,
      email: u.email,
      role: u.role,
      // Direct CDN URL for Cloudinary; API proxy for legacy binary/FS storage
      photo: u.photo
        ? (u.photoStorage === 'cloudinary' ? u.photo : `/api/users/${u._id.toString()}/photo`)
        : null,
      approved: u.approved,
      sessionVersion: u.sessionVersion || 1,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin
    }));
    
    res.setHeader('X-Total-Count', total);
    res.json(formatted);
  } catch (e) {
    logger.error('Get users error:', e);
    res.status(500).json({ error: 'Failed to retrieve users' });
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
router.get('/:username/session', authenticateToken, async (req, res) => {
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
router.patch('/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
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
router.patch('/:id/unapprove', authenticateToken, requireAdmin, async (req, res) => {
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
router.patch('/:id/role', authenticateToken, requireAdmin, async (req, res) => {
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
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
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
 * PATCH /api/users/:id/reset-password
 * Admin reset user password (Admin Only)
 */
router.patch('/:id/reset-password', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    
    const db = getDB();
    const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { password: hashedPassword },
        $inc: { sessionVersion: 1 }
      }
    );
    
    await logAudit(db, 'USER_PASSWORD_RESET_BY_ADMIN', req.user.userId, req.user.username, {
      targetUserId: id,
      targetUsername: user.username
    });
    
    logger.info(`Admin ${req.user.username} reset password for user: ${user.username}`);
    
    res.json({ success: true, message: `Password reset for "${user.username}" successfully` });
  } catch (e) {
    logger.error('Reset user password error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * PATCH /api/users/change-password
 * Change user password (requires current password)
 */
router.patch('/change-password', authenticateToken, async (req, res) => {
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
 * Upload / replace user profile photo.
 * Images are stored on Cloudinary CDN (not in the database or filesystem).
 */
router.post('/:id/photo', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, username } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' });
    }

    if (!isCloudinaryConfigured()) {
      return res.status(503).json({ error: 'Image storage is not configured. Please contact your administrator.' });
    }

    const db = getDB();
    const user = await db.collection('users').findOne({ _id: new ObjectId(id) });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only allow the user themselves (or an admin) to change the photo
    if (req.user.userId !== id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorised to update this profile photo' });
    }

    // Delete the previous Cloudinary asset (avoids orphaned files)
    if (user.cloudinaryPublicId) {
      await deleteCloudinaryAsset(user.cloudinaryPublicId);
    }

    // Upload new image to Cloudinary
    let cloudinaryResult;
    try {
      cloudinaryResult = await uploadUserPhoto(req.file.buffer, req.file.mimetype, id);
    } catch (uploadErr) {
      logger.error('Cloudinary user photo upload failed:', uploadErr.message);
      return res.status(422).json({ error: uploadErr.message });
    }

    const { url: photoUrl, publicId: cloudinaryPublicId } = cloudinaryResult;

    // Persist CDN URL + public_id in the user document
    await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          photo:              photoUrl,          // Cloudinary CDN URL
          cloudinaryPublicId: cloudinaryPublicId,
          photoStorage:       'cloudinary',
          photoUpdatedAt:     new Date(),
          lastModified:       new Date(),
          lastModifiedBy:     userId || null,
          lastModifiedByUsername: username || 'Unknown'
        },
        $unset: { photoDbId: '', photoFilename: '' }
      }
    );

    await logAudit(db, 'USER_PHOTO_UPDATED', userId || null, username || 'system', {
      userId: id,
      cloudinaryPublicId
    });

    logger.info(`User photo uploaded to Cloudinary for user ${id}: ${cloudinaryPublicId}`);
    res.json({ success: true, photo: photoUrl, message: 'Profile photo updated successfully' });
  } catch (e) {
    logger.error('User photo upload error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/users/:id/photo
 * Serve user profile photo.
 *
 * New uploads → redirect to Cloudinary CDN URL (fast, cached globally).
 * Legacy uploads (DB binary / filesystem) → served directly for backward compatibility.
 */
router.get('/:id/photo', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();
    const user = await db.collection('users').findOne({ _id: new ObjectId(id) });

    if (!user) return res.status(404).json({ error: 'User not found' });

    // ── Cloudinary-stored photo (new) ──────────────────────────────────────
    if (user.photoStorage === 'cloudinary' && user.photo && user.photo.startsWith('http')) {
      // Redirect browser to CDN — no bandwidth cost on our server
      return res.redirect(302, user.photo);
    }

    // ── Legacy: DB-stored binary ───────────────────────────────────────────
    if (user.photoStorage === 'db' || user.photoDbId) {
      const imgId = user.photoDbId || String(user.photo || '').replace(/^db:/, '');
      if (!imgId) return res.status(404).json({ error: 'No stored photo' });

      const photoData = await getPhotoFromDatabase(db, 'user_images', imgId);
      if (!photoData) return res.status(404).json({ error: 'Image not found' });

      res.setHeader('Content-Type', photoData.contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(photoData.data);
    }

    // ── Legacy: filesystem-stored ──────────────────────────────────────────
    const filename = user.photoFilename || (user.photo && path.basename(user.photo));
    if (!filename) return res.status(404).json({ error: 'No photo available' });

    const imgPath = path.join(__dirname, '..', 'uploads', 'users', filename);
    return res.sendFile(imgPath, err => {
      if (err) {
        logger.warn('Failed to send user photo file:', err.message);
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
 * Delete user profile photo (removes from Cloudinary + clears DB fields).
 */
router.delete('/:id/photo', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, username } = req.query;
    const db = getDB();

    const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Only the owner or an admin may delete the photo
    if (req.user.userId !== id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorised to delete this profile photo' });
    }

    // Remove from Cloudinary (new storage)
    if (user.cloudinaryPublicId) {
      await deleteCloudinaryAsset(user.cloudinaryPublicId);
    }

    // Remove legacy DB-stored binary
    if ((user.photoStorage === 'db' || user.photoDbId) && !user.cloudinaryPublicId) {
      try {
        const photoId = user.photoDbId || String(user.photo || '').replace(/^db:/, '');
        if (photoId) await deletePhotoFromDatabase(db, 'user_images', photoId);
      } catch (err) {
        logger.warn('Failed to delete legacy DB user photo:', err.message);
      }
    }

    // Remove legacy filesystem photo
    if (user.photoStorage === 'fs' && user.photoFilename) {
      try {
        await deletePhotoFile(path.join(__dirname, '..', 'uploads', 'users', user.photoFilename));
      } catch (err) {
        logger.warn('Failed to delete legacy FS user photo:', err.message);
      }
    }

    await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      {
        $set:   { photo: null, lastModified: new Date(), lastModifiedBy: userId || null, lastModifiedByUsername: username || 'Unknown' },
        $unset: { cloudinaryPublicId: '', photoFilename: '', photoDbId: '', photoStorage: '' }
      }
    );

    await logAudit(db, 'USER_PHOTO_DELETED', userId || null, username || 'system', { userId: id });

    res.json({ success: true, message: 'Profile photo removed' });
  } catch (e) {
    logger.error('Delete user photo error:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
