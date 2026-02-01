/**
 * Checkout Routes Module
 * Handles checkout, invoice generation, and public invoice links
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { ObjectId } = require('mongodb');
const { getDB } = require('../db');
const logger = require('../logger');
const { validateCheckout } = require('../validators');
const { logAudit } = require('../services/auditService');
const { sanitizeString } = require('../services/helpers');
const { COMPANY_NAME, COMPANY_PHONE, COMPANY_ADDRESS, COMPANY_EMAIL, COMPANY_GSTIN } = require('../config/constants');

/**
 * POST /api/checkout
 * Process checkout with discount, state GST, and profit tracking
 */
router.post('/', async (req, res) => {
  try {
    // Validate checkout data
    const validationErrors = validateCheckout(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors.join(', ') });
    }

    const payload = req.body;
    const items = Array.isArray(payload.items) ? payload.items : [];
    const customerId = payload.customerId || null;
    const discountPercent = parseFloat(payload.discountPercent) || 0;
    const customerState = payload.customerState || 'Same'; // 'Same' or 'Other'
    
    // Normalize payment mode to lowercase
    let paymentMode = (payload.paymentMode || 'cash').toLowerCase();
    
    // Handle split payment details
    let splitPaymentDetails = null;
    if (paymentMode === 'split') {
      splitPaymentDetails = {
        cashAmount: parseFloat(payload.cashAmount) || 0,
        upiAmount: parseFloat(payload.upiAmount) || 0,
        cardAmount: parseFloat(payload.cardAmount) || 0,
        totalAmount: parseFloat(payload.totalAmount) || parseFloat(payload.total) || 0
      };
    }
    
    const userId = payload.userId || null;
    const username = sanitizeString(payload.username || 'Unknown');
    const db = getDB();
    
    // Get customer details
    let customerName = 'Walk-in Customer';
    let customerPhone = null;
    let customerAddress = '';
    let customerPlace = '';
    let customerPincode = '';
    if (customerId) {
      const customer = await db.collection('customers').findOne({ _id: new ObjectId(customerId) });
      if (customer) {
        customerName = customer.name;
        customerPhone = customer.phone;
        customerAddress = customer.address || '';
        customerPlace = customer.place || '';
        customerPincode = customer.pincode || '';
      }
    }
    
    // Generate bill number
    const billPrefix = `INV-${new Date().getFullYear()}-`;
    const billCount = await db.collection('bills').countDocuments({ billNumber: new RegExp(`^${billPrefix}`) });
    const billNumber = `${billPrefix}${String(billCount + 1).padStart(4, '0')}`;
    
    // Calculate totals
    let subtotal = 0;
    let totalCost = 0;
    const isSameState = customerState === 'Same';
    
    // Prepare bill document
    const bill = {
      billNumber,
      customerId: customerId ? new ObjectId(customerId) : null,
      customerName,
      customerPhone,
      customerAddress,
      customerState,
      customerPlace,
      customerPincode,
      isSameState,
      discountPercent,
      paymentMode,
      paymentStatus: 'Paid',
      billDate: new Date(),
      items: [],
      createdBy: userId,
      createdByUsername: username
    };
    
    // Add split payment details if applicable
    if (splitPaymentDetails) {
      bill.splitPaymentDetails = splitPaymentDetails;
    }

    // Process items and update inventory
    for (const it of items) {
      // Get product details
      const product = await db.collection('products').findOne({ _id: new ObjectId(it.productId) });
      
      if (!product) continue;
      
      const lineSubtotal = it.price * it.quantity;
      const lineCost = (product.costPrice || 0) * it.quantity;
      
      // Calculate line profit before discount
      const lineProfit = lineSubtotal - lineCost;
      
      bill.items.push({
        productId: new ObjectId(it.productId),
        productName: product.name,
        hsnCode: product.hsnCode || '9999',
        quantity: it.quantity,
        costPrice: product.costPrice || 0,
        unitPrice: it.price,
        lineSubtotal: lineSubtotal,
        lineCost: lineCost,
        lineProfit: lineProfit
      });
      
      subtotal += lineSubtotal;
      totalCost += lineCost;
      
      // Update product quantity
      await db.collection('products').updateOne(
        { _id: new ObjectId(it.productId) },
        { $inc: { quantity: -it.quantity } }
      );
    }

    // Calculate discount (percentage first)
    let discountAmount = (subtotal * discountPercent) / 100;
    let afterDiscount = subtotal - discountAmount;
    
    // Calculate GST
    let cgst = 0, sgst = 0, igst = 0;
    let gstAmount = 0;
    
    if (isSameState) {
      // Same state: CGST 9% + SGST 9% = 18%
      cgst = afterDiscount * 0.09;
      sgst = afterDiscount * 0.09;
      gstAmount = cgst + sgst;
    } else {
      // Different state: IGST 18%
      igst = afterDiscount * 0.18;
      gstAmount = igst;
    }
    
    const grandTotal = afterDiscount + gstAmount;
    const totalProfit = subtotal - totalCost - discountAmount; // Net profit after discount, before tax
    
    // Add calculated values to bill
    bill.subtotal = parseFloat(subtotal.toFixed(2));
    bill.discountAmount = parseFloat(discountAmount.toFixed(2));
    bill.afterDiscount = parseFloat(afterDiscount.toFixed(2));
    bill.cgst = parseFloat(cgst.toFixed(2));
    bill.sgst = parseFloat(sgst.toFixed(2));
    bill.igst = parseFloat(igst.toFixed(2));
    bill.gstAmount = parseFloat(gstAmount.toFixed(2));
    // Round grand total to nearest integer for invoices & dashboard clarity
    bill.grandTotal = Math.round(grandTotal);
    bill.totalCost = parseFloat(totalCost.toFixed(2));
    bill.totalProfit = parseFloat(totalProfit.toFixed(2));

    // Insert bill
    const result = await db.collection('bills').insertOne(bill);
    
    // Log audit trail
    await logAudit(db, 'SALE_COMPLETED', userId, username, {
      billId: result.insertedId.toString(),
      billNumber,
      customerName: bill.customerName,
      grandTotal: bill.grandTotal,
      itemCount: bill.items.length,
      paymentMode
    });
    
    res.json({ 
      billId: result.insertedId.toString(), 
      billNumber,
      customerName: bill.customerName,
      customerPhone: bill.customerPhone,
      customerPlace: bill.customerPlace || null,
      customerPincode: bill.customerPincode || null,
      paymentMode: bill.paymentMode,
      items: bill.items.map(item => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineSubtotal: item.lineSubtotal
      })),
      subtotal: bill.subtotal,
      discountPercent: bill.discountPercent,
      discountAmount: bill.discountAmount,
      companyPhone: bill.companyPhone || COMPANY_PHONE,
      gstAmount: bill.gstAmount,
      grandTotal: bill.grandTotal,
      profit: bill.totalProfit
    });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/invoices
 * Get all invoices (recent 100)
 */
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const bills = await db.collection('bills')
      .find({})
      .sort({ billDate: -1 })
      .limit(100)
      .toArray();
    
    const formatted = bills.map(bill => ({
      id: bill._id.toString(),
      billNumber: bill.billNumber || bill._id.toString(),
      customerId: bill.customerId ? bill.customerId.toString() : null,
      customerName: bill.customerName || 'Walk-in Customer',
      customerPhone: bill.customerPhone || null,
      customerPlace: bill.customerPlace || bill.customer_place || null,
      customerPincode: bill.customerPincode || bill.customer_pincode || null,
      customerAddress: bill.customerAddress || null,
      // Include customer object for InvoiceCard display
      customer: bill.customerId ? {
        id: bill.customerId.toString(),
        name: bill.customerName,
        phone: bill.customerPhone
      } : null,
      subtotal: bill.subtotal || 0,
      discountPercent: bill.discountPercent || 0,
      discountValue: bill.discountPercent || 0,
      discountAmount: bill.discountAmount || 0,
      afterDiscount: bill.afterDiscount || 0,
      taxRate: (bill.cgst > 0 || bill.sgst > 0) ? 18 : (bill.igst > 0 ? 18 : 0),
      taxAmount: bill.gstAmount || 0,
      cgst: bill.cgst || 0,
      sgst: bill.sgst || 0,
      igst: bill.igst || 0,
      total: bill.grandTotal || 0,
      grandTotal: bill.grandTotal || 0,
      totalProfit: bill.totalProfit || 0,
      paymentMode: bill.paymentMode || 'Cash',
      splitPaymentDetails: bill.splitPaymentDetails || null,
      items: bill.items ? bill.items.map(item => ({
        productId: item.productId ? item.productId.toString() : null,
        productName: item.productName || 'Unknown',
        name: item.productName || 'Unknown',
        hsnCode: item.hsnCode || '9999',
        quantity: item.quantity || 0,
        unitPrice: item.unitPrice || 0,
        price: item.unitPrice || 0,
        lineSubtotal: item.lineSubtotal || 0
      })) : [],
      created_at: bill.billDate,
      date: bill.billDate,
      billDate: bill.billDate,
      createdByUsername: bill.createdByUsername || 'Unknown',
      companyPhone: bill.companyPhone || COMPANY_PHONE
    }));
    
    res.json(formatted);
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/invoices/:id
 * Get a specific invoice by ID or billNumber
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();
    
    let invoice = null;
    try {
      invoice = await db.collection('bills').findOne({ _id: new ObjectId(id) });
    } catch (e) {}
    
    if (!invoice) {
      invoice = await db.collection('bills').findOne({ billNumber: id });
    }
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    res.json({
      id: invoice._id.toString(),
      billNumber: invoice.billNumber,
      customerName: invoice.customerName,
      customerPhone: invoice.customerPhone,
      customerPlace: invoice.customerPlace,
      customerPincode: invoice.customerPincode,
      customerAddress: invoice.customerAddress,
      billDate: invoice.billDate,
      items: invoice.items,
      subtotal: invoice.subtotal,
      discountAmount: invoice.discountAmount,
      gstAmount: invoice.gstAmount,
      grandTotal: invoice.grandTotal,
      paymentMode: invoice.paymentMode
    });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/invoices/:id/public
 * Create a short-lived public link for an invoice
 */
router.post('/:id/public', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();

    // Ensure invoice exists (try ObjectId then billNumber)
    let invoice = null;
    try {
      invoice = await db.collection('bills').findOne({ _id: new ObjectId(id) });
    } catch (e) {}
    if (!invoice) {
      invoice = await db.collection('bills').findOne({ billNumber: id });
    }

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    // create token and store in DB
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

    await db.collection('public_invoice_links').insertOne({
      token,
      invoiceId: invoice._id.toString(),
      createdAt: new Date(),
      expiresAt: new Date(expiresAt),
      createdBy: req.body.requestedBy || 'system',
      companySnapshot: req.body.company || {
        name: COMPANY_NAME,
        phone: COMPANY_PHONE,
        address: COMPANY_ADDRESS,
        email: COMPANY_EMAIL,
        gstin: COMPANY_GSTIN
      }
    });

    const base = process.env.PUBLIC_BASE_URL || (req.protocol + '://' + req.get('host'));
    const publicUrl = `${base}/public/invoice/${token}`;

    // Log audit
    await logAudit(db, 'PUBLIC_INVOICE_LINK_CREATED', null, req.body.requestedBy || 'system', { 
      invoiceId: invoice._id.toString(), 
      token 
    });

    res.json({ publicUrl, token, expiresAt });
  } catch (e) {
    logger.error('Create public invoice link failed', e);
    res.status(500).json({ error: 'Failed to create public link' });
  }
});

/**
 * POST /api/invoices/:id/whatsapp-link
 * Generate WhatsApp share link for invoice
 */
router.post('/:id/whatsapp-link', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();
    
    let invoice = null;
    try {
      invoice = await db.collection('bills').findOne({ _id: new ObjectId(id) });
    } catch (e) {}
    
    if (!invoice) {
      invoice = await db.collection('bills').findOne({ billNumber: id });
    }
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Retrieve customer phone if not in invoice but customerId exists
    let customerPhone = invoice.customerPhone;
    if (!customerPhone && invoice.customerId) {
      try {
        const customer = await db.collection('customers').findOne({ _id: new ObjectId(invoice.customerId) });
        if (customer && customer.phone) {
          customerPhone = customer.phone;
        }
      } catch (e) {
        logger.warn('Failed to fetch customer phone for WhatsApp link', e);
      }
    }
    
    // Generate public link for invoice
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

    await db.collection('public_invoice_links').insertOne({
      token,
      invoiceId: invoice._id.toString(),
      createdAt: new Date(),
      expiresAt: new Date(expiresAt),
      createdBy: req.body.requestedBy || 'system',
      companySnapshot: {
        name: COMPANY_NAME,
        phone: COMPANY_PHONE,
        address: COMPANY_ADDRESS,
        email: COMPANY_EMAIL,
        gstin: COMPANY_GSTIN
      }
    });

    const base = process.env.PUBLIC_BASE_URL || (req.protocol + '://' + req.get('host'));
    const publicUrl = `${base}/public/invoice/${token}`;
    
    // Generate WhatsApp message
    const customerName = invoice.customerName || 'Customer';
    const message = `Hi ${customerName}, here's your invoice #${invoice.billNumber} from ${COMPANY_NAME}. Total: ₹${invoice.grandTotal}. View: ${publicUrl}`;
    
    // Format phone number with +91 prefix for Indian numbers
    let whatsappUrl = null;
    if (customerPhone) {
      const cleanPhone = String(customerPhone).replace(/[^0-9]/g, '');
      // Add +91 prefix if it's a 10-digit number (Indian number)
      const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    }
    
    await logAudit(db, 'PUBLIC_INVOICE_LINK_CREATED', null, req.body.requestedBy || 'system', { 
      invoiceId: invoice._id.toString(), 
      token,
      hasPhone: !!customerPhone,
      customerName: invoice.customerName
    });

    res.json({ 
      publicUrl, 
      whatsappUrl,
      token, 
      expiresAt,
      hasPhone: !!customerPhone,
      customerName: invoice.customerName || 'Customer' 
    });
  } catch (e) {
    logger.error('Create WhatsApp link failed', e);
    res.status(500).json({ error: 'Failed to create WhatsApp link' });
  }
});

module.exports = router;
