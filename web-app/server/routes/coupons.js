/**
 * Coupons & Discounts Routes Module
 * Manages discount coupons for the billing system
 */

const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { getDB } = require('../db');
const logger = require('../logger');
const { logAudit } = require('../services/auditService');

/**
 * GET /api/coupons
 * Get all coupons
 */
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const coupons = await db.collection('coupons')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    
    const formatted = coupons.map(c => ({
      id: c._id.toString(),
      code: c.code,
      description: c.description,
      discountType: c.discountType, // 'percentage' or 'fixed'
      discountValue: c.discountValue,
      minPurchase: c.minPurchase || 0,
      maxDiscount: c.maxDiscount || null,
      usageLimit: c.usageLimit || null,
      usedCount: c.usedCount || 0,
      validFrom: c.validFrom,
      validUntil: c.validUntil,
      isActive: c.isActive,
      createdAt: c.createdAt,
      createdBy: c.createdBy
    }));
    
    res.json(formatted);
  } catch (e) {
    logger.error('Coupons fetch error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/coupons
 * Create a new coupon
 */
router.post('/', async (req, res) => {
  try {
    const { code, description, discountType, discountValue, minPurchase, maxDiscount, usageLimit, validFrom, validUntil, userId, username } = req.body;
    
    if (!code || !discountType || !discountValue) {
      return res.status(400).json({ error: 'Code, discount type, and discount value are required' });
    }
    
    const db = getDB();
    
    // Check for duplicate code
    const existing = await db.collection('coupons').findOne({ 
      code: code.toUpperCase() 
    });
    if (existing) {
      return res.status(400).json({ error: 'Coupon code already exists' });
    }
    
    const coupon = {
      code: code.toUpperCase(),
      description: description || '',
      discountType, // 'percentage' or 'fixed'
      discountValue: parseFloat(discountValue),
      minPurchase: parseFloat(minPurchase) || 0,
      maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
      usageLimit: usageLimit ? parseInt(usageLimit) : null,
      usedCount: 0,
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validUntil: validUntil ? new Date(validUntil) : null,
      isActive: true,
      createdAt: new Date(),
      createdBy: username || 'Unknown'
    };
    
    const result = await db.collection('coupons').insertOne(coupon);
    
    await logAudit(db, 'COUPON_CREATED', userId, username, {
      couponId: result.insertedId.toString(),
      code: coupon.code,
      discountType,
      discountValue
    });
    
    res.json({ id: result.insertedId.toString(), ...coupon });
  } catch (e) {
    logger.error('Coupon create error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/coupons/validate
 * Validate a coupon code for checkout
 */
router.post('/validate', async (req, res) => {
  try {
    const { code, cartTotal } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Coupon code is required' });
    }
    
    const db = getDB();
    const coupon = await db.collection('coupons').findOne({ 
      code: code.toUpperCase(), 
      isActive: true 
    });
    
    if (!coupon) {
      return res.status(404).json({ error: 'Invalid or expired coupon code' });
    }
    
    // Check date validity
    const now = new Date();
    if (coupon.validFrom && now < new Date(coupon.validFrom)) {
      return res.status(400).json({ error: 'Coupon is not yet valid' });
    }
    if (coupon.validUntil && now > new Date(coupon.validUntil)) {
      return res.status(400).json({ error: 'Coupon has expired' });
    }
    
    // Check usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ error: 'Coupon usage limit reached' });
    }
    
    // Check minimum purchase
    const total = parseFloat(cartTotal) || 0;
    if (coupon.minPurchase && total < coupon.minPurchase) {
      return res.status(400).json({ 
        error: `Minimum purchase of ₹${coupon.minPurchase} required` 
      });
    }
    
    // Calculate discount
    let discountAmount;
    if (coupon.discountType === 'percentage') {
      discountAmount = (total * coupon.discountValue) / 100;
      if (coupon.maxDiscount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscount);
      }
    } else {
      discountAmount = coupon.discountValue;
    }
    
    res.json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount: Math.round(discountAmount * 100) / 100,
      description: coupon.description
    });
  } catch (e) {
    logger.error('Coupon validate error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * PATCH /api/coupons/:id
 * Update a coupon
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const db = getDB();
    
    const allowedFields = ['description', 'discountValue', 'minPurchase', 'maxDiscount', 'usageLimit', 'validFrom', 'validUntil', 'isActive'];
    const updateDoc = {};
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (field === 'validFrom' || field === 'validUntil') {
          updateDoc[field] = updates[field] ? new Date(updates[field]) : null;
        } else if (['discountValue', 'minPurchase', 'maxDiscount'].includes(field)) {
          updateDoc[field] = parseFloat(updates[field]) || 0;
        } else if (field === 'usageLimit') {
          updateDoc[field] = updates[field] ? parseInt(updates[field]) : null;
        } else {
          updateDoc[field] = updates[field];
        }
      }
    }
    
    updateDoc.updatedAt = new Date();
    
    await db.collection('coupons').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateDoc }
    );
    
    res.json({ success: true });
  } catch (e) {
    logger.error('Coupon update error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * DELETE /api/coupons/:id
 * Delete a coupon
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, username } = req.query;
    const db = getDB();
    
    const coupon = await db.collection('coupons').findOne({ _id: new ObjectId(id) });
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }
    
    await db.collection('coupons').deleteOne({ _id: new ObjectId(id) });
    
    await logAudit(db, 'COUPON_DELETED', userId, username, {
      couponId: id,
      code: coupon.code
    });
    
    res.json({ success: true });
  } catch (e) {
    logger.error('Coupon delete error:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
