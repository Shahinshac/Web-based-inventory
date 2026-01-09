/**
 * Customers Routes Module
 * Handles all customer-related API endpoints
 */

const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const logger = require('../logger');
const { validateCustomer } = require('../validators');
const { logAudit } = require('../services/auditService');
const { sanitizeObject } = require('../services/helpers');

/**
 * GET /api/customers
 * Get all customers sorted by name
 */
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const customers = await db.collection('customers')
      .find({})
      .sort({ name: 1 })
      .toArray();
    
    const formatted = customers.map(c => ({
      id: c._id.toString(),
      name: c.name,
      phone: c.phone,
      pincode: c.pincode || '',
      place: c.place || '',
      address: c.address,
      state: c.state || 'Same',
      gstin: c.gstin || ''
    }));
    
    res.json(formatted);
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/customers
 * Add a new customer
 */
router.post('/', async (req, res) => {
  try {
    const { name, phone, address, gstin, place, pincode, userId, username } = req.body;
    
    // Validate customer data
    const customerData = { name, phone, address, gstin, place };
    const validationErrors = validateCustomer(customerData);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors.join(', ') });
    }
    
    const db = getDB();
    
    const customer = {
      name: sanitizeObject(name),
      phone: phone ? sanitizeObject(phone) : '',
      address: address ? sanitizeObject(address) : '',
      place: place ? sanitizeObject(place) : '',
      pincode: pincode ? sanitizeObject(pincode) : '',
      gstin: gstin ? sanitizeObject(gstin) : '',
      purchasesCount: 0,
      totalPurchases: 0,
      createdAt: new Date(),
      createdBy: userId || null,
      createdByUsername: username || 'Unknown'
    };
    
    const result = await db.collection('customers').insertOne(customer);
    
    // Log audit trail
    await logAudit(db, 'CUSTOMER_ADDED', userId, username, {
      customerId: result.insertedId.toString(),
      customerName: name,
      phone
    });
    
    res.json({ id: result.insertedId.toString(), ...customer });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
