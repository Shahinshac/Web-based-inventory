/**
 * Data Export Routes Module
 * Handles CSV/JSON export for various data types
 */

const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const logger = require('../logger');

/**
 * Helper: Convert array of objects to CSV string
 */
function toCSV(data, columns) {
  if (!data || data.length === 0) return '';
  
  const headers = columns.map(c => c.label).join(',');
  const rows = data.map(row => {
    return columns.map(c => {
      let val = c.getter ? c.getter(row) : (row[c.key] ?? '');
      // Escape CSV special characters
      val = String(val).replace(/"/g, '""');
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        val = `"${val}"`;
      }
      return val;
    }).join(',');
  });
  
  return [headers, ...rows].join('\n');
}

/**
 * GET /api/exports/products
 * Export products as CSV
 */
router.get('/products', async (req, res) => {
  try {
    const db = getDB();
    const products = await db.collection('products').find({}).sort({ name: 1 }).toArray();
    
    const columns = [
      { key: 'name', label: 'Product Name' },
      { key: 'barcode', label: 'Barcode' },
      { key: 'hsnCode', label: 'HSN Code' },
      { key: 'costPrice', label: 'Cost Price' },
      { key: 'sellingPrice', label: 'Selling Price' },
      { key: 'quantity', label: 'Stock' },
      { key: 'minStock', label: 'Min Stock' },
      { key: 'category', label: 'Category' },
      { label: 'Profit Margin', getter: (p) => p.sellingPrice && p.costPrice ? ((p.sellingPrice - p.costPrice) / p.costPrice * 100).toFixed(1) + '%' : 'N/A' }
    ];
    
    const csv = toCSV(products, columns);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=products_export.csv');
    res.send(csv);
  } catch (e) {
    logger.error('Product export error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/exports/customers
 * Export customers as CSV
 */
router.get('/customers', async (req, res) => {
  try {
    const db = getDB();
    const customers = await db.collection('customers').find({}).sort({ name: 1 }).toArray();
    
    const columns = [
      { key: 'name', label: 'Customer Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'address', label: 'Address' },
      { label: 'Total Purchases', getter: (c) => c.totalPurchases || 0 },
      { label: 'Total Spent', getter: (c) => c.totalSpent || 0 },
      { label: 'Created Date', getter: (c) => c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A' }
    ];
    
    const csv = toCSV(customers, columns);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=customers_export.csv');
    res.send(csv);
  } catch (e) {
    logger.error('Customer export error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/exports/invoices
 * Export invoices as CSV with optional date range
 */
router.get('/invoices', async (req, res) => {
  try {
    const db = getDB();
    const { startDate, endDate } = req.query;
    
    const filter = {};
    if (startDate || endDate) {
      filter.billDate = {};
      if (startDate) filter.billDate.$gte = new Date(startDate);
      if (endDate) filter.billDate.$lte = new Date(endDate);
    }
    
    const invoices = await db.collection('bills').find(filter).sort({ billDate: -1 }).toArray();
    
    const columns = [
      { label: 'Invoice #', getter: (i) => i.billNumber || i._id.toString() },
      { label: 'Date', getter: (i) => i.billDate ? new Date(i.billDate).toLocaleDateString() : 'N/A' },
      { label: 'Customer', getter: (i) => i.customerName || 'Walk-in' },
      { label: 'Items', getter: (i) => (i.items || []).length },
      { label: 'Subtotal', getter: (i) => i.subtotal || 0 },
      { label: 'Discount', getter: (i) => i.discountAmount || 0 },
      { label: 'GST', getter: (i) => i.gstAmount || 0 },
      { label: 'Grand Total', getter: (i) => i.grandTotal || i.total || 0 },
      { label: 'Payment Mode', getter: (i) => i.paymentMode || 'N/A' },
      { label: 'Status', getter: (i) => i.paymentStatus || 'N/A' },
      { label: 'Cashier', getter: (i) => i.username || 'N/A' }
    ];
    
    const csv = toCSV(invoices, columns);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=invoices_export.csv');
    res.send(csv);
  } catch (e) {
    logger.error('Invoice export error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/exports/expenses
 * Export expenses as CSV
 */
router.get('/expenses', async (req, res) => {
  try {
    const db = getDB();
    const { startDate, endDate } = req.query;
    
    const filter = {};
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    
    const expenses = await db.collection('expenses').find(filter).sort({ date: -1 }).toArray();
    
    const columns = [
      { key: 'description', label: 'Description' },
      { key: 'amount', label: 'Amount' },
      { key: 'category', label: 'Category' },
      { label: 'Date', getter: (e) => e.date ? new Date(e.date).toLocaleDateString() : 'N/A' },
      { key: 'createdByUsername', label: 'Created By' }
    ];
    
    const csv = toCSV(expenses, columns);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=expenses_export.csv');
    res.send(csv);
  } catch (e) {
    logger.error('Expense export error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/exports/returns
 * Export returns as CSV
 */
router.get('/returns', async (req, res) => {
  try {
    const db = getDB();
    const returns = await db.collection('returns').find({}).sort({ createdAt: -1 }).toArray();
    
    const columns = [
      { key: 'billNumber', label: 'Invoice #' },
      { key: 'customerName', label: 'Customer' },
      { label: 'Items Returned', getter: (r) => (r.items || []).map(i => `${i.name} x${i.quantity}`).join('; ') },
      { key: 'refundAmount', label: 'Refund Amount' },
      { key: 'reason', label: 'Reason' },
      { key: 'status', label: 'Status' },
      { label: 'Date', getter: (r) => r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'N/A' },
      { key: 'processedByUsername', label: 'Processed By' }
    ];
    
    const csv = toCSV(returns, columns);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=returns_export.csv');
    res.send(csv);
  } catch (e) {
    logger.error('Returns export error:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
