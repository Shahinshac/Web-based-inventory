/**
 * Express Application Configuration
 * Main application setup with routes and middleware
 */

// Load environment variables FIRST
require('dotenv').config();

// CRITICAL: Log environment variables to diagnose deployment issues
console.log('🔍 Environment Variables Check:');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? `Set (${process.env.MONGODB_URI.substring(0, 20)}...)` : '❌ NOT SET');
console.log('DB_NAME:', process.env.DB_NAME || '❌ NOT SET');
console.log('ADMIN_USERNAME:', process.env.ADMIN_USERNAME || '❌ NOT SET');
console.log('ADMIN_PASSWORD:', process.env.ADMIN_PASSWORD ? '✓ Set (hidden)' : '❌ NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || '❌ NOT SET');
console.log('PORT:', process.env.PORT || '4000 (default)');
console.log('---');

const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('./logger');

// Import middleware
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

// Import routes
const productsRoutes = require('./routes/products');
const customersRoutes = require('./routes/customers');
const checkoutRoutes = require('./routes/checkout');
const usersRoutes = require('./routes/users');
const analyticsRoutes = require('./routes/analytics');
const expensesRoutes = require('./routes/expenses');
const adminRoutes = require('./routes/admin');
const backupRoutes = require('./routes/backup');
const publicRoutes = require('./routes/public');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// HTTP request logging middleware
app.use(logger.httpLogger);

// Root health check
app.get('/', (req, res) => {
  res.send('Welcome To Our BoB\'s Inventory Collection App ✨✨🎊🎉');
});

// Simple health check
app.get('/api/ping', (req, res) => {
  res.json({ ok: true });
});

// Stats endpoint (legacy support - could be moved to analytics)
app.get('/api/stats', async (req, res) => {
  try {
    const { getDB } = require('./db');
    const db = getDB();
    
    const productCount = await db.collection('products').countDocuments();
    const customerCount = await db.collection('customers').countDocuments();
    
    const revenueResult = await db.collection('bills').aggregate([
      { $match: { paymentStatus: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]).toArray();
    
    const invoiceCount = await db.collection('bills').countDocuments();
    const lowStockCount = await db.collection('products').countDocuments({ quantity: { $lt: 20 } });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySalesResult = await db.collection('bills').aggregate([
      { 
        $match: { 
          paymentStatus: 'Paid',
          billDate: { $gte: today }
        } 
      },
      { $group: { _id: null, total: { $sum: '$grandTotal' }, profit: { $sum: '$totalProfit' } } }
    ]).toArray();

    res.json({
      totalProducts: productCount,
      totalCustomers: customerCount,
      totalRevenue: revenueResult.length > 0 ? revenueResult[0].total : 0,
      totalInvoices: invoiceCount,
      lowStockCount: lowStockCount,
      todaySales: todaySalesResult.length > 0 ? todaySalesResult[0].total : 0,
      todayProfit: todaySalesResult.length > 0 ? todaySalesResult[0].profit : 0
    });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

// API Routes
app.use('/api/products', productsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/invoices', checkoutRoutes); // Invoice routes are in checkout
app.use('/api/users', usersRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/audit-logs', adminRoutes); // Audit logs are in admin
app.use('/api/backup', backupRoutes);
app.use('/api/export', backupRoutes); // Export routes are in backup

// Public routes (no authentication)
app.use('/public', publicRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

module.exports = app;
