/**
 * Express Application Configuration
 * Main application setup with routes and middleware
 */

// Load environment variables FIRST
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const logger = require('./logger');
const { CORS_ORIGIN, NODE_ENV } = require('./config/constants');
const { authenticateToken, requireAdmin } = require('./middleware/auth');

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
const returnsRoutes = require('./routes/returns');
const couponsRoutes = require('./routes/coupons');
const exportsRoutes = require('./routes/exports');

// Create Express app
const app = express();

// Security headers
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: NODE_ENV === 'production'
}));

// Rate limiting — login endpoint (brute-force protection)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts — please try again in 15 minutes' }
});

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please slow down' }
});

// Middleware
const corsOptions = {
  origin: CORS_ORIGIN === '*' ? '*' : CORS_ORIGIN.split(','),
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// General API rate limit
app.use('/api/', apiLimiter);

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// HTTP request logging middleware
app.use(logger.httpLogger);

// Root health check
app.get('/', (req, res) => {
  res.send('Welcome To Shahinsha\'s Inventory Management App ✨✨🎊🎉');
});

// Simple health check
app.get('/api/ping', (req, res) => {
  res.json({ ok: true });
});

// Stats endpoint (legacy support - could be moved to analytics)
app.get('/api/stats', authenticateToken, async (req, res) => {
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
    logger.error('Stats error:', e);
    res.status(500).json({ error: 'Failed to retrieve stats' });
  }
});

/**
 * Middleware that skips authentication for GET photo-serving requests.
 * Browser <img> src attributes cannot send Authorization headers, so
 * photo endpoints must be publicly accessible.
 */
function requireAuthUnlessPhoto(req, res, next) {
  if (req.method === 'GET' && /\/photo(\/|$|\?)/.test(req.path)) {
    return next();
  }
  return authenticateToken(req, res, next);
}

// API Routes
// Users routes — login/register are public; admin sub-routes are protected internally
app.use('/api/users/login', loginLimiter);
app.use('/api/users', usersRoutes);

// Protected routes — require valid JWT (photos bypass auth so browser <img> tags work)
app.use('/api/products', requireAuthUnlessPhoto, productsRoutes);
app.use('/api/customers', authenticateToken, customersRoutes);
app.use('/api/checkout', authenticateToken, checkoutRoutes);
app.use('/api/invoices', authenticateToken, checkoutRoutes);
app.use('/api/analytics', authenticateToken, analyticsRoutes);
app.use('/api/expenses', authenticateToken, expensesRoutes);
app.use('/api/returns', authenticateToken, returnsRoutes);
app.use('/api/coupons', authenticateToken, couponsRoutes);
app.use('/api/exports', authenticateToken, exportsRoutes);
app.use('/api/admin', authenticateToken, requireAdmin, adminRoutes);
app.use('/api/audit-logs', authenticateToken, requireAdmin, adminRoutes);
app.use('/api/backup', authenticateToken, requireAdmin, backupRoutes);
app.use('/api/export', authenticateToken, requireAdmin, backupRoutes);

// Public routes (no authentication)
app.use('/public', publicRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

module.exports = app;
