/**
 * Admin Routes Module
 * Handles admin-only operations and database management
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const path = require('path');
const fsSync = require('fs');
const { ObjectId } = require('mongodb');
const { getDB } = require('../db');
const logger = require('../logger');
const { logAudit } = require('../services/auditService');
const { ALLOW_ADMIN_PASSWORD_CHANGE } = require('../config/constants');

/**
 * POST /api/admin/change-admin-password
 * Change admin password (disabled by default)
 */
router.post('/change-admin-password', async (req, res) => {
  if (!ALLOW_ADMIN_PASSWORD_CHANGE) {
    return res.status(403).json({ 
      error: 'Admin password change via API is disabled. Enable by setting ALLOW_ADMIN_PASSWORD_CHANGE=true.' 
    });
  }
  
  try {
    const { adminUsername, currentPassword, newPassword, logoutAll } = req.body;
    if (!adminUsername || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = getDB();
    const admin = await db.collection('users').findOne({ 
      username: adminUsername.toLowerCase(), 
      role: 'admin' 
    });
    
    if (!admin) {
      return res.status(403).json({ error: 'Admin user not found' });
    }

    // Verify current password
    const match = await bcrypt.compare(currentPassword, admin.password);
    if (!match) {
      return res.status(401).json({ error: 'Current admin password incorrect' });
    }

    // Update password
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.collection('users').updateOne(
      { _id: admin._id }, 
      { 
        $set: { password: hashed }, 
        $inc: { sessionVersion: 1 } 
      }
    );

    // Optionally invalidate all sessions across users
    if (logoutAll) {
      await db.collection('users').updateMany({}, { $inc: { sessionVersion: 1 } });
      await logAudit(db, 'ADMIN_PASSWORD_CHANGED_INVALIDATE_ALL', null, adminUsername, { 
        message: 'Admin changed password and logged out all sessions' 
      });
    } else {
      await logAudit(db, 'ADMIN_PASSWORD_CHANGED', null, adminUsername, { 
        message: 'Admin changed password' 
      });
    }

    res.json({ success: true, message: 'Admin password updated successfully' });
  } catch (e) {
    logger.error('Change password error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/admin/update-company-phone
 * Update company phone in all invoices
 */
router.post('/update-company-phone', async (req, res) => {
  try {
    const { adminUsername, adminPassword, companyPhone } = req.body;
    if (!adminUsername || !adminPassword || !companyPhone) {
      return res.status(400).json({ 
        error: 'adminUsername, adminPassword and companyPhone are required' 
      });
    }
    
    const db = getDB();
    const admin = await db.collection('users').findOne({ 
      username: adminUsername.toLowerCase(), 
      role: 'admin' 
    });
    
    if (!admin) {
      return res.status(403).json({ error: 'Admin user not found' });
    }
    
    const match = await bcrypt.compare(adminPassword, admin.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }

    // Validate phone format (basic validation)
    const normalizedPhone = String(companyPhone).trim();
    const phoneRegex = /^[0-9+\-()\s]{6,30}$/;
    if (!phoneRegex.test(normalizedPhone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Update all bills
    const result = await db.collection('bills').updateMany(
      {}, 
      { $set: { companyPhone: normalizedPhone } }
    );
    
    await logAudit(db, 'ADMIN_UPDATE_COMPANY_PHONE', admin._id.toString(), admin.username, { 
      companyPhone, 
      matched: result.matchedCount, 
      modified: result.modifiedCount 
    });
    
    res.json({ 
      success: true, 
      message: `Updated ${result.modifiedCount} invoices with companyPhone ${companyPhone}` 
    });
  } catch (e) {
    logger.error('Update company phone failed', e);
    res.status(500).json({ error: 'Failed to update companyPhone', details: e.message });
  }
});

/**
 * POST /api/admin/clear-database
 * Clear all data except admin users (with photo cleanup)
 */
router.post('/clear-database', async (req, res) => {
  try {
    const { adminUsername, adminPassword } = req.body;
    if (!adminUsername || !adminPassword) {
      return res.status(400).json({ error: 'Admin credentials required' });
    }
    
    const db = getDB();
    const admin = await db.collection('users').findOne({ 
      username: adminUsername.toLowerCase(), 
      role: 'admin' 
    });
    
    if (!admin) {
      return res.status(403).json({ error: 'Admin user not found' });
    }
    
    const match = await bcrypt.compare(adminPassword, admin.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }
    
    logger.info('🗑️  Starting database clear operation...');
    
    const results = {
      products: 0,
      customers: 0,
      bills: 0,
      invoices: 0,
      expenses: 0,
      audit_logs: 0,
      users: 0,
      product_images: 0,
      user_images: 0,
      photos: 0
    };
    
    // Clear all collections with counts
    const productsResult = await db.collection('products').deleteMany({});
    results.products = productsResult.deletedCount;
    
    const customersResult = await db.collection('customers').deleteMany({});
    results.customers = customersResult.deletedCount;
    
    const billsResult = await db.collection('bills').deleteMany({});
    results.bills = billsResult.deletedCount;
    
    const invoicesResult = await db.collection('invoices').deleteMany({});
    results.invoices = invoicesResult.deletedCount;
    
    const expensesResult = await db.collection('expenses').deleteMany({});
    results.expenses = expensesResult.deletedCount;
    
    const auditResult = await db.collection('audit_logs').deleteMany({});
    results.audit_logs = auditResult.deletedCount;
    
    // Clear image collections
    const productImagesResult = await db.collection('product_images').deleteMany({});
    results.product_images = productImagesResult.deletedCount;
    
    const userImagesResult = await db.collection('user_images').deleteMany({});
    results.user_images = userImagesResult.deletedCount;
    
    // Keep users collection but delete all except admin
    const usersResult = await db.collection('users').deleteMany({ role: { $ne: 'admin' } });
    results.users = usersResult.deletedCount;
    
    // Clear uploaded photo files from filesystem
    try {
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      if (fsSync.existsSync(uploadsDir)) {
        const subdirs = ['products', 'users', 'profiles'];
        
        for (const subdir of subdirs) {
          const dirPath = path.join(uploadsDir, subdir);
          if (fsSync.existsSync(dirPath)) {
            const files = fsSync.readdirSync(dirPath);
            for (const file of files) {
              try {
                fsSync.unlinkSync(path.join(dirPath, file));
                results.photos++;
              } catch (err) {
                logger.warn(`Failed to delete photo ${file}:`, err.message);
              }
            }
          }
        }
      }
    } catch (photoError) {
      logger.warn('Photo cleanup error:', photoError.message);
    }
    
    const total = Object.values(results).reduce((sum, count) => sum + count, 0);
    
    logger.info('✅ Database cleared successfully');
    logger.info(`📊 Total items deleted: ${total}`);
    
    await logAudit(db, 'ADMIN_CLEAR_DATABASE', admin._id.toString(), admin.username, results);
    
    res.json({ 
      success: true, 
      message: 'All data cleared successfully',
      results: results,
      total: total,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error clearing database:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to clear database', 
      details: error.message 
    });
  }
});

/**
 * POST /api/admin/clear-db-except-products
 * Clear all data except products and admin users
 */
router.post('/clear-db-except-products', async (req, res) => {
  try {
    const { adminUsername, adminPassword } = req.body;
    if (!adminUsername || !adminPassword) {
      return res.status(400).json({ error: 'Admin credentials required' });
    }
    
    const db = getDB();
    const admin = await db.collection('users').findOne({ 
      username: adminUsername.toLowerCase(), 
      role: 'admin' 
    });
    
    if (!admin) {
      return res.status(403).json({ error: 'Admin user not found' });
    }
    
    const match = await bcrypt.compare(adminPassword, admin.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }
    
    logger.info('🗑️  Starting partial database clear (keeping products)...');
    
    const results = {
      customers: 0,
      bills: 0,
      invoices: 0,
      expenses: 0,
      audit_logs: 0,
      users: 0
    };
    
    // Clear collections except products
    const customersResult = await db.collection('customers').deleteMany({});
    results.customers = customersResult.deletedCount;
    
    const billsResult = await db.collection('bills').deleteMany({});
    results.bills = billsResult.deletedCount;
    
    const invoicesResult = await db.collection('invoices').deleteMany({});
    results.invoices = invoicesResult.deletedCount;
    
    const expensesResult = await db.collection('expenses').deleteMany({});
    results.expenses = expensesResult.deletedCount;
    
    const auditResult = await db.collection('audit_logs').deleteMany({});
    results.audit_logs = auditResult.deletedCount;
    
    // Keep users collection but delete all except admin
    const usersResult = await db.collection('users').deleteMany({ role: { $ne: 'admin' } });
    results.users = usersResult.deletedCount;
    
    const total = Object.values(results).reduce((sum, count) => sum + count, 0);
    
    logger.info('✅ Database cleared successfully (products preserved)');
    logger.info(`📊 Total items deleted: ${total}`);
    
    await logAudit(db, 'ADMIN_CLEAR_DB_EXCEPT_PRODUCTS', admin._id.toString(), admin.username, results);
    
    res.json({ 
      success: true, 
      message: 'Database cleared successfully (products preserved)',
      results: results,
      total: total,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error clearing database:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to clear database', 
      details: error.message 
    });
  }
});

/**
 * POST /api/admin/reset-database
 * Reset database and reinitialize with defaults
 */
router.post('/reset-database', async (req, res) => {
  try {
    const { adminUsername, adminPassword } = req.body;
    if (!adminUsername || !adminPassword) {
      return res.status(400).json({ error: 'Admin credentials required' });
    }
    
    const db = getDB();
    const admin = await db.collection('users').findOne({ 
      username: adminUsername.toLowerCase(), 
      role: 'admin' 
    });
    
    if (!admin) {
      return res.status(403).json({ error: 'Admin user not found' });
    }
    
    const match = await bcrypt.compare(adminPassword, admin.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }
    
    logger.info('🔄 Starting database reset...');
    
    // First clear all data
    await db.collection('products').deleteMany({});
    await db.collection('customers').deleteMany({});
    await db.collection('bills').deleteMany({});
    await db.collection('invoices').deleteMany({});
    await db.collection('expenses').deleteMany({});
    await db.collection('audit_logs').deleteMany({});
    await db.collection('product_images').deleteMany({});
    await db.collection('user_images').deleteMany({});
    await db.collection('users').deleteMany({ role: { $ne: 'admin' } });
    
    // Reinitialize indexes
    try {
      await db.collection('products').createIndex({ name: 1 });
      await db.collection('products').createIndex({ sku: 1 }, { unique: true, sparse: true });
      await db.collection('customers').createIndex({ name: 1 });
      await db.collection('customers').createIndex({ phone: 1 }, { sparse: true });
      await db.collection('invoices').createIndex({ created_at: -1 });
      await db.collection('users').createIndex({ username: 1 }, { unique: true });
      logger.info('✅ Database indexes recreated');
    } catch (indexError) {
      logger.warn('Index creation warning:', indexError.message);
    }
    
    logger.info('✅ Database reset completed successfully');
    
    await logAudit(db, 'ADMIN_RESET_DATABASE', admin._id.toString(), admin.username, {});
    
    res.json({ 
      success: true, 
      message: 'Database reset and reinitialized successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error resetting database:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to reset database', 
      details: error.message 
    });
  }
});

/**
 * POST /api/admin/invalidate-user-session
 * Invalidate a specific user's sessions
 */
router.post('/invalidate-user-session', async (req, res) => {
  try {
    const { targetUsername, adminUsername, adminPassword } = req.body;
    if (!adminUsername || !adminPassword || !targetUsername) {
      return res.status(400).json({ error: 'Admin credentials and target username required' });
    }

    const db = getDB();
    const admin = await db.collection('users').findOne({ 
      username: adminUsername.toLowerCase(), 
      role: 'admin' 
    });
    
    if (!admin) {
      return res.status(403).json({ error: 'Admin user not found' });
    }
    
    const match = await bcrypt.compare(adminPassword, admin.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }

    const targetUser = await db.collection('users').findOne({ 
      username: targetUsername.toLowerCase() 
    });
    
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    await db.collection('users').updateOne(
      { _id: targetUser._id }, 
      { $inc: { sessionVersion: 1 } }
    );
    
    await logAudit(db, 'USER_SESSION_INVALIDATED', null, adminUsername, { 
      target: targetUser.username 
    });
    
    res.json({ 
      success: true, 
      message: `Invalidated sessions for ${targetUser.username}` 
    });
  } catch (e) {
    logger.error('Invalidate session error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/admin/database-stats
 * Get database statistics
 */
router.get('/database-stats', async (req, res) => {
  try {
    const db = getDB();
    
    const stats = {
      products: await db.collection('products').countDocuments(),
      customers: await db.collection('customers').countDocuments(),
      bills: await db.collection('bills').countDocuments(),
      invoices: await db.collection('invoices').countDocuments(),
      expenses: await db.collection('expenses').countDocuments(),
      audit_logs: await db.collection('audit_logs').countDocuments(),
      users: {
        total: await db.collection('users').countDocuments(),
        admins: await db.collection('users').countDocuments({ role: 'admin' }),
        managers: await db.collection('users').countDocuments({ role: 'manager' }),
        cashiers: await db.collection('users').countDocuments({ role: 'cashier' })
      },
      product_images: await db.collection('product_images').countDocuments(),
      user_images: await db.collection('user_images').countDocuments()
    };
    
    // Get database size info
    try {
      const dbStats = await db.stats();
      stats.database = {
        size: dbStats.dataSize,
        storageSize: dbStats.storageSize,
        collections: dbStats.collections,
        indexes: dbStats.indexes
      };
    } catch (statsError) {
      logger.warn('Could not fetch database stats:', statsError.message);
    }
    
    res.json({ success: true, stats });
  } catch (error) {
    logger.error('Error fetching database stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch database statistics', 
      details: error.message 
    });
  }
});

/**
 * GET /api/audit-logs
 * Get audit logs (Admin Only)
 * Supports pagination, date range filtering, and action type filtering
 */
const { authenticateToken } = require('../middleware/auth');
router.get('/audit-logs', authenticateToken, async (req, res) => {
  try {
    const db = getDB();
    const limit = Math.min(parseInt(req.query.limit) || 50, 500); // Max 500 logs
    const skip = parseInt(req.query.skip) || 0;
    const action = req.query.action;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    
    // Build query with filters
    let query = {};
    
    // Action filter
    if (action && action !== 'all') {
      query.action = action;
    }
    
    // Date range filter
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }
    
    // Get total count for pagination
    const total = await db.collection('audit_logs').countDocuments(query);
    
    // Fetch logs with pagination
    const logs = await db.collection('audit_logs')
      .find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    const formatted = logs.map(log => ({
      id: log._id.toString(),
      action: log.action,
      userId: log.userId ? log.userId.toString() : null,
      username: log.username,
      timestamp: log.timestamp,
      details: log.details,
      metadata: log.metadata || null
    }));
    
    // Return consistent response format with pagination info
    res.json({
      logs: formatted,
      total,
      page: Math.floor(skip / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (e) {
    logger.error('Get audit logs error:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
