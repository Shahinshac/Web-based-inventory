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

/**
 * PUT /api/customers/:id
 * Update an existing customer
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, address, gstin, place, pincode, userId, username } = req.body;
    
    // Validate customer data
    const customerData = { name, phone, address, gstin, place };
    const validationErrors = validateCustomer(customerData);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors.join(', ') });
    }
    
    const db = getDB();
    const { ObjectId } = require('mongodb');
    
    // Check if customer exists
    const existingCustomer = await db.collection('customers').findOne({ _id: new ObjectId(id) });
    if (!existingCustomer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    const updatedData = {
      name: sanitizeObject(name),
      phone: phone ? sanitizeObject(phone) : '',
      address: address ? sanitizeObject(address) : '',
      place: place ? sanitizeObject(place) : '',
      pincode: pincode ? sanitizeObject(pincode) : '',
      gstin: gstin ? sanitizeObject(gstin) : '',
      updatedAt: new Date(),
      updatedBy: userId || null,
      updatedByUsername: username || 'Unknown'
    };
    
    await db.collection('customers').updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );
    
    // Log audit trail
    await logAudit(db, 'CUSTOMER_UPDATED', userId, username, {
      customerId: id,
      customerName: name,
      changes: updatedData
    });
    
    res.json({ id, ...existingCustomer, ...updatedData });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * DELETE /api/customers/:id
 * Delete a customer
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, username } = req.body;
    
    const db = getDB();
    const { ObjectId } = require('mongodb');
    
    // Check if customer exists
    const customer = await db.collection('customers').findOne({ _id: new ObjectId(id) });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Check if customer has any invoices
    const invoiceCount = await db.collection('bills').countDocuments({ 
      customerId: id 
    });
    
    if (invoiceCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete customer with ${invoiceCount} existing invoices. Archive customer instead.` 
      });
    }
    
    await db.collection('customers').deleteOne({ _id: new ObjectId(id) });
    
    // Log audit trail
    await logAudit(db, 'CUSTOMER_DELETED', userId, username, {
      customerId: id,
      customerName: customer.name,
      phone: customer.phone
    });
    
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
