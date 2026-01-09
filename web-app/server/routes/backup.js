/**
 * Backup Routes Module
 * Handles data backup and export functionality
 */

const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const logger = require('../logger');

/**
 * GET /api/backup/json
 * Backup all data to JSON format
 */
router.get('/json', async (req, res) => {
  try {
    const db = getDB();
    const backup = {
      timestamp: new Date().toISOString(),
      products: await db.collection('products').find({}).toArray(),
      customers: await db.collection('customers').find({}).toArray(),
      bills: await db.collection('bills').find({}).toArray(),
      users: await db.collection('users').find({}, { projection: { password: 0 } }).toArray()
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=backup-${Date.now()}.json`);
    res.json(backup);
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: 'Backup failed' });
  }
});

/**
 * GET /api/backup/products-csv
 * Export products to CSV format
 */
router.get('/products-csv', async (req, res) => {
  try {
    const db = getDB();
    const products = await db.collection('products').find({}).toArray();
    
    let csv = 'Name,SKU,Quantity,Price,Cost Price,HSN Code,Min Stock,Profit\n';
    products.forEach(p => {
      const profit = p.price - (p.costPrice || 0);
      csv += `"${p.name}","${p.sku || ''}",${p.quantity},${p.price},${p.costPrice || 0},"${p.hsnCode || ''}",${p.minStock || 10},${profit}\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=products-${Date.now()}.csv`);
    res.send(csv);
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: 'Export failed' });
  }
});

/**
 * GET /api/backup/invoices-csv
 * Export invoices to CSV format
 */
router.get('/invoices-csv', async (req, res) => {
  try {
    const db = getDB();
    const bills = await db.collection('bills').find({}).toArray();
    
    let csv = 'Bill Number,Date,Customer,Items,Subtotal,Discount,Tax,Total,Profit,Payment Mode\n';
    bills.forEach(b => {
      const itemCount = b.items?.length || 0;
      csv += `"${b.billNumber}","${new Date(b.billDate).toLocaleString()}","${b.customerName}",${itemCount},${b.subtotal},${b.discountAmount},${b.gstAmount},${b.grandTotal},${b.totalProfit},"${b.paymentMode}"\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=invoices-${Date.now()}.csv`);
    res.send(csv);
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: 'Export failed' });
  }
});

module.exports = router;
