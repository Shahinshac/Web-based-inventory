/**
 * Returns & Refunds Routes Module
 * Handles product returns and refund processing
 */

const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { getDB } = require('../db');
const logger = require('../logger');
const { logAudit } = require('../services/auditService');

/**
 * GET /api/returns
 * Get all returns with optional date filtering
 */
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const { startDate, endDate } = req.query;
    
    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    const returns = await db.collection('returns')
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();
    
    const formatted = returns.map(r => ({
      id: r._id.toString(),
      invoiceId: r.invoiceId,
      billNumber: r.billNumber,
      customerName: r.customerName,
      items: r.items,
      refundAmount: r.refundAmount,
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt,
      processedBy: r.processedBy,
      processedByUsername: r.processedByUsername
    }));
    
    res.json(formatted);
  } catch (e) {
    logger.error('Returns fetch error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/returns
 * Process a new return/refund
 */
router.post('/', async (req, res) => {
  try {
    const { invoiceId, billNumber, customerName, items, refundAmount, reason, userId, username } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required for return' });
    }
    if (!reason) {
      return res.status(400).json({ error: 'Return reason is required' });
    }
    
    const db = getDB();
    
    // Restore stock for returned items
    for (const item of items) {
      if (item.productId) {
        await db.collection('products').updateOne(
          { _id: new ObjectId(item.productId) },
          { $inc: { quantity: item.quantity } }
        );
      }
    }
    
    const returnDoc = {
      invoiceId: invoiceId || null,
      billNumber: billNumber || 'N/A',
      customerName: customerName || 'Walk-in',
      items: items.map(i => ({
        productId: i.productId,
        name: i.name,
        quantity: i.quantity,
        price: i.price,
        total: i.quantity * i.price
      })),
      refundAmount: parseFloat(refundAmount) || 0,
      reason,
      status: 'completed',
      createdAt: new Date(),
      processedBy: userId || null,
      processedByUsername: username || 'Unknown'
    };
    
    const result = await db.collection('returns').insertOne(returnDoc);
    
    // Log audit trail
    await logAudit(db, 'RETURN_PROCESSED', userId, username, {
      returnId: result.insertedId.toString(),
      billNumber,
      refundAmount,
      itemCount: items.length,
      reason
    });
    
    res.json({ 
      id: result.insertedId.toString(),
      ...returnDoc
    });
  } catch (e) {
    logger.error('Return processing error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/returns/stats
 * Get return statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const db = getDB();
    
    const totalReturns = await db.collection('returns').countDocuments();
    
    const refundTotal = await db.collection('returns').aggregate([
      { $group: { _id: null, total: { $sum: '$refundAmount' } } }
    ]).toArray();
    
    // Today's returns
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayReturns = await db.collection('returns').countDocuments({
      createdAt: { $gte: today }
    });
    
    // This month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthReturns = await db.collection('returns').aggregate([
      { $match: { createdAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$refundAmount' }, count: { $sum: 1 } } }
    ]).toArray();
    
    res.json({
      totalReturns,
      totalRefunded: refundTotal[0]?.total || 0,
      todayReturns,
      monthReturns: monthReturns[0]?.count || 0,
      monthRefunded: monthReturns[0]?.total || 0
    });
  } catch (e) {
    logger.error('Return stats error:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
