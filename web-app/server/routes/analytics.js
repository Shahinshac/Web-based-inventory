/**
 * Analytics Routes Module
 * Handles analytics and reporting endpoints
 */

const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const logger = require('../logger');

/**
 * GET /api/analytics/stats
 * Get overview statistics
 */
router.get('/stats', async (req, res) => {
  try {
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

/**
 * GET /api/analytics/top-products
 * Get top selling products
 */
router.get('/top-products', async (req, res) => {
  try {
    const db = getDB();
    const limit = parseInt(req.query.limit) || 10;
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const bills = await db.collection('bills')
      .find({ billDate: { $gte: startDate } })
      .toArray();
    
    // Aggregate product sales
    const productSales = {};
    bills.forEach(bill => {
      bill.items.forEach(item => {
        const productName = item.productName;
        if (!productSales[productName]) {
          productSales[productName] = { 
            quantity: 0, 
            revenue: 0, 
            profit: 0 
          };
        }
        productSales[productName].quantity += item.quantity;
        productSales[productName].revenue += item.lineSubtotal || 0;
        productSales[productName].profit += item.lineProfit || 0;
      });
    });
    
    // Sort by revenue and get top N
    const topProducts = Object.entries(productSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
    
    res.json(topProducts);
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: 'Failed to get top products' });
  }
});

/**
 * GET /api/analytics/revenue
 * Get revenue summary
 */
router.get('/revenue', async (req, res) => {
  try {
    const db = getDB();
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const bills = await db.collection('bills')
      .find({ billDate: { $gte: startDate } })
      .toArray();
    
    const totalRevenue = bills.reduce((sum, bill) => sum + (bill.grandTotal || 0), 0);
    const totalProfit = bills.reduce((sum, bill) => sum + (bill.totalProfit || 0), 0);
    const totalCost = bills.reduce((sum, bill) => sum + (bill.totalCost || 0), 0);
    const totalBills = bills.length;
    
    res.json({
      totalRevenue: Math.round(totalRevenue),
      totalProfit: Math.round(totalProfit),
      totalCost: Math.round(totalCost),
      profitMargin: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(2) : 0,
      totalBills,
      averageOrderValue: totalBills > 0 ? Math.round(totalRevenue / totalBills) : 0
    });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: 'Failed to get revenue data' });
  }
});

/**
 * GET /api/analytics/profit
 * Get profit summary
 */
router.get('/profit', async (req, res) => {
  try {
    const db = getDB();
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const bills = await db.collection('bills')
      .find({ billDate: { $gte: startDate } })
      .sort({ billDate: 1 })
      .toArray();
    
    // Group by date
    const dailyProfit = {};
    bills.forEach(bill => {
      const date = new Date(bill.billDate).toLocaleDateString();
      if (!dailyProfit[date]) {
        dailyProfit[date] = { revenue: 0, profit: 0, count: 0 };
      }
      dailyProfit[date].revenue += bill.grandTotal || 0;
      dailyProfit[date].profit += bill.totalProfit || 0;
      dailyProfit[date].count += 1;
    });
    
    res.json(dailyProfit);
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: 'Failed to get profit data' });
  }
});

/**
 * GET /api/analytics/low-stock
 * Get low stock items
 */
router.get('/low-stock', async (req, res) => {
  try {
    const db = getDB();
    
    const lowStock = await db.collection('products')
      .find({ $expr: { $lte: ['$quantity', '$minStock'] } })
      .sort({ quantity: 1 })
      .toArray();
    
    const formatted = lowStock.map(p => ({
      name: p.name,
      currentStock: p.quantity,
      minStock: p.minStock || 10,
      shortage: (p.minStock || 10) - p.quantity
    }));
    
    res.json(formatted);
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: 'Failed to get low stock items' });
  }
});

/**
 * GET /api/analytics/sales-trend
 * Get sales trend over time
 */
router.get('/sales-trend', async (req, res) => {
  try {
    const db = getDB();
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const sales = await db.collection('bills')
      .find({ billDate: { $gte: startDate } })
      .sort({ billDate: 1 })
      .toArray();
    
    // Group by date
    const dailySales = {};
    sales.forEach(bill => {
      const date = new Date(bill.billDate).toLocaleDateString();
      if (!dailySales[date]) {
        dailySales[date] = { revenue: 0, profit: 0, count: 0 };
      }
      dailySales[date].revenue += bill.grandTotal || 0;
      dailySales[date].profit += bill.totalProfit || 0;
      dailySales[date].count += 1;
    });
    
    res.json(dailySales);
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: 'Failed to get sales trend' });
  }
});

module.exports = router;
