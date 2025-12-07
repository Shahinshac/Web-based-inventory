// Load environment variables FIRST before anything else
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const fs = require('fs').promises;
const fsSync = require('fs');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
// DB connector & utility
const { connectDB, getDB, closeDB } = require('./db');
const { ObjectId } = require('mongodb');
const logger = require('./logger');
// OTP functionality and email-sending helpers are no longer used in this
// deployment. The previous OTP endpoints, the email-send flow and related
// helpers have been removed to keep the server lean and avoid unused code.
// Registration remains "direct" (username + password) and email fields are
// optional on user records.

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Multer for file uploads
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Sanitization helpers
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').trim();
}

// Import validators
const { validateCheckout, validateProduct, validateCustomer } = require('./validators');

// HTTP request logging middleware
app.use(logger.httpLogger);

// Root health check
app.get('/', (req, res) => res.send('Welcome To Our BoB\'s Inventory Collection App ✨✨🎊🎉'));

// Simple health
app.get('/api/ping', (req, res) => res.json({ ok: true }));

// Products
app.get('/api/products', async (req, res) => {
  try {
    const db = getDB();
    const products = await db.collection('products')
      .find({})
      .sort({ name: 1 })
      .toArray();
    
    // Convert _id to id for frontend compatibility
    const formatted = products.map(p => ({
      id: p._id.toString(),
      _id: p._id.toString(),
      name: p.name,
      quantity: p.quantity,
      price: p.price,
      costPrice: p.costPrice || 0,
      hsnCode: p.hsnCode || '9999',
      minStock: p.minStock || 10,
      barcode: p.barcode || null,
      photo: p.photo || null,
      profit: p.price - (p.costPrice || 0),
      profitPercent: p.price > 0 ? (((p.price - (p.costPrice || 0)) / p.price) * 100).toFixed(2) : 0
    }));
    
    res.json(formatted);
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Customers
app.get('/api/customers', async (req, res) => {
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
      ,
      // loyalty removed from client summary per config
    }));
    
    res.json(formatted);
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Loyalty feature removed: endpoint deleted per request

// Checkout: Enhanced with discount, state GST, profit tracking
app.post('/api/checkout', async (req, res) => {
  try {
    // Validate checkout data
    const validationErrors = validateCheckout(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors.join(', ') });
    }

    const payload = req.body;
    const items = Array.isArray(payload.items) ? payload.items : [];
    const customerId = payload.customerId || null;
    // applyLoyalty removed; loyalty functionality deprecated
    // referralNumber removed; loyalty functionality deprecated
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

    // Loyalty logic: issue a card when a customer makes their first qualifying purchase (>= 150000)
    // and apply a flat ₹3,000 discount on subsequent qualifying purchases.
    // This implementation treats the loyalty card as a single-use discount (remainingUses = 1).
    // Loyalty removed — no loyalty discounts applied or issued

    // Previous loyalty logic removed: we no longer issue or apply loyalty at checkout

    // Apply loyaltyDiscount (flat) after percentage discount
    if (loyaltyDiscount > 0) {
      const effectiveLoyalty = Math.min(loyaltyDiscount, afterDiscount);
      afterDiscount = afterDiscount - effectiveLoyalty;
      discountAmount = discountAmount + effectiveLoyalty;
    }
    
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
    // Attach loyalty info to bill if present
    // Loyalty fields removed from bill

    const result = await db.collection('bills').insertOne(bill);
    
    // Log audit trail
    await logAudit(db, 'SALE_COMPLETED', userId, username, {
      billId: result.insertedId.toString(),
      billNumber,
      customerName: bill.customerName,
      grandTotal: bill.grandTotal,
      itemCount: bill.items.length,
      paymentMode
    // Loyalty and referral fields removed from audit
    });
    
    // Invoice email sending is disabled/removed in this deployment. If you
    // need invoice emails in the future, implement a secure mail sender and
    // re-enable here with proper configuration and secrets.
    
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
      companyPhone: bill.companyPhone || process.env.COMPANY_PHONE || '7594012761',
      gstAmount: bill.gstAmount,
      grandTotal: bill.grandTotal,
      profit: bill.totalProfit,
      // Loyalty removed - not returned in API
    });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Add Product
app.post('/api/products', async (req, res) => {
  try {
    const { name, quantity, price, costPrice, hsnCode, minStock, userId, username } = req.body;
    
    // Validate product data
    const productData = { name, quantity, price, costPrice, hsnCode, minStock };
    const validationErrors = validateProduct(productData);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors.join(', ') });
    }
    
    const db = getDB();
    
    const product = {
      name: sanitizeObject(name),
      quantity: parseInt(quantity) || 0,
      price: parseFloat(price) || 0,
      costPrice: parseFloat(costPrice) || 0,
      hsnCode: hsnCode || '9999',
      minStock: parseInt(minStock) || 10,
      barcode: null, // Will be generated after insertion
      photo: null,   // Will be fetched automatically or uploaded separately
      createdAt: new Date(),
      createdBy: userId || null,
      createdByUsername: username || 'Unknown'
    };
    
    const result = await db.collection('products').insertOne(product);
    const productId = result.insertedId.toString();
    
    // Generate automatic barcode
    const barcodeValue = generateProductBarcode(name, productId);
    
    // Update product with barcode
    await db.collection('products').updateOne(
      { _id: result.insertedId },
      { 
        $set: { 
          barcode: barcodeValue
        } 
      }
    );
    
    // Log audit trail
    await logAudit(db, 'PRODUCT_ADDED', userId, username, {
      productId: productId,
      productName: name,
      barcode: barcodeValue,
      quantity,
      price,
      costPrice,
    });
    
    res.json({ 
      id: productId, 
      ...product,
      barcode: barcodeValue,
    });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Update Product Stock
app.patch('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, userId, username } = req.body;
    const db = getDB();
    
    // Get product before update
    const product = await db.collection('products').findOne({ _id: new ObjectId(id) });
    const oldQuantity = product?.quantity || 0;
    const newQuantity = parseInt(quantity) || 0;
    
    await db.collection('products').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          quantity: newQuantity,
          lastModifiedBy: userId || null,
          lastModifiedByUsername: username || 'Unknown',
          lastModified: new Date()
        } 
      }
    );
    
    // Log audit trail
    await logAudit(db, 'PRODUCT_STOCK_UPDATED', userId, username, {
      productId: id,
      productName: product?.name || 'Unknown',
      oldQuantity,
      newQuantity,
      change: newQuantity - oldQuantity
    });
    
    res.json({ success: true });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Delete Product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, username } = req.query;
    const db = getDB();
    
    // Get product before deleting
    const product = await db.collection('products').findOne({ _id: new ObjectId(id) });
    
    // Delete product photo if exists
    if (product?.photo) {
      try {
        await fs.unlink(path.join(__dirname, 'uploads', 'products', path.basename(product.photo)));
      } catch (err) {
        logger.warn('Failed to delete product photo:', err.message);
      }
    }
    
    await db.collection('products').deleteOne({ _id: new ObjectId(id) });
    
    // Log audit trail
    await logAudit(db, 'PRODUCT_DELETED', userId, username, {
      productId: id,
      productName: product?.name || 'Unknown',
      quantity: product?.quantity || 0,
      price: product?.price || 0
    });
    
    res.json({ success: true });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Generate barcode image for a product
app.get('/api/products/:id/barcode', async (req, res) => {
  try {
    const { id } = req.params;
    const format = req.query.format || 'image'; // 'image' or 'qr'
    const db = getDB();
    
    const product = await db.collection('products').findOne({ _id: new ObjectId(id) });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const barcodeValue = product.barcode || generateProductBarcode(product.name, id);
    
    if (format === 'qr') {
      // Generate QR code with product info
      const qrData = {
        id: id,
        name: product.name,
        barcode: barcodeValue,
        price: product.price
      };
      const qrImage = await generateQRCode(qrData);
      res.json({ barcode: barcodeValue, qrCode: qrImage });
    } else {
      // Generate standard barcode
      const barcodeImage = await generateBarcodeImage(barcodeValue);
      res.json({ barcode: barcodeValue, image: barcodeImage });
    }
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Search product by barcode (for POS scanning)
app.get('/api/products/barcode/:barcode', async (req, res) => {
  try {
    const { barcode } = req.params;
    const db = getDB();
    
    // Search by barcode, SKU, or product name (case-insensitive)
    const searchQuery = {
      $or: [
        { barcode: barcode },
        { sku: barcode },
        { name: { $regex: barcode, $options: 'i' } }
      ]
    };
    
    const product = await db.collection('products').findOne(searchQuery);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({
      id: product._id.toString(),
      name: product.name,
      price: product.price,
      costPrice: product.costPrice || 0,
      quantity: product.quantity,
      barcode: product.barcode,
      sku: product.sku,
      photo: product.photo
    });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Upload product photo
app.post('/api/products/:id/photo', upload.single('photo'), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, username } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No photo file uploaded' });
    }
    
    const db = getDB();
    const product = await db.collection('products').findOne({ _id: new ObjectId(id) });
    
    if (!product) {
      // Clean up uploaded file
      await fs.unlink(req.file.path);
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Delete old photo if exists (support both DB-backed and filesystem-backed)
    if (product.photo) {
      try {
        if (product.photoStorage === 'db' || product.photoDbId) {
          const photoId = product.photoDbId || String(product.photo).replace(/^db:/, '');
          if (photoId) await db.collection('product_images').deleteOne({ _id: new ObjectId(photoId) });
        } else {
          const filename = product.photoFilename || (product.photo && path.basename(product.photo));
          if (filename) await fs.unlink(path.join(__dirname, 'uploads', 'products', filename));
        }
      } catch (err) {
        logger.warn('Failed to delete old photo:', err.message);
      }
    }
    
    // Build fully-qualified photo URL so clients can use it directly
    const base = process.env.PUBLIC_BASE_URL || (req.protocol + '://' + req.get('host'));
    let photoUrl = `${base}/api/products/${id}/photo`;

    // Default photo storage: DB unless explicitly requested 'fs'
    const storageMode = String(req.query.storage || '').toLowerCase();
    const useDbStorage = (storageMode !== 'fs');
    if (useDbStorage) {
      // Read file into buffer, insert into product_images collection
      const buffer = await fs.readFile(req.file.path);
      const imgDoc = {
        productId: new ObjectId(id),
        filename: req.file.originalname || req.file.filename,
        contentType: req.file.mimetype || 'application/octet-stream',
        data: buffer,
        uploadedAt: new Date()
      };

      const imgResult = await db.collection('product_images').insertOne(imgDoc);
      // remove file from disk (we don't need it when storing in DB)
      try { await fs.unlink(req.file.path); } catch (e) {/* ignore */}

      // product.photo will point at server image endpoint; photoDbId stores DB image id
      await db.collection('products').updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            photo: photoUrl,
            photoStorage: 'db',
            photoDbId: imgResult.insertedId.toString(),
            lastModifiedBy: userId || null,
            lastModifiedByUsername: username || 'Unknown',
            lastModified: new Date()
          }
        }
      );

    } else {
      // filesystem-backed - keep a reference to the filename while exposing a stable API URL
      photoUrl = `${base}/api/products/${id}/photo`;
      await db.collection('products').updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            photo: photoUrl,
            photoStorage: 'fs',
            photoFilename: req.file.filename,
            lastModifiedBy: userId || null,
            lastModifiedByUsername: username || 'Unknown',
            lastModified: new Date()
          }
        }
      );
    }
    
    // Log audit trail
    await logAudit(db, 'PRODUCT_PHOTO_UPDATED', userId, username, {
      productId: id,
      productName: product.name,
      photoUrl: photoUrl
    });
    
    res.json({ 
      success: true, 
      photo: photoUrl,
      message: 'Product photo uploaded successfully' 
    });
  } catch (e) {
    logger.error(e);
    // Clean up file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkErr) {
        logger.error('Failed to clean up file:', unlinkErr);
      }
    }
    res.status(500).json({ error: e.message });
  }
});


// Delete product photo
app.delete('/api/products/:id/photo', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, username } = req.query;
    const db = getDB();
    
    const product = await db.collection('products').findOne({ _id: new ObjectId(id) });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    if (product.photo) {
      // If photo references DB-stored image (db:<id>), remove from product_images collection
      if (String(product.photo).startsWith('db:') || product.photoDbId) {
        const photoId = product.photoDbId || String(product.photo).replace(/^db:/, '');
        try {
          await db.collection('product_images').deleteOne({ _id: new ObjectId(photoId) });
        } catch (err) {
          logger.warn('Failed to delete DB-stored product photo:', err.message);
        }
      } else {
        // filesystem-backed image
        try {
          await fs.unlink(path.join(__dirname, 'uploads', 'products', path.basename(product.photo)));
        } catch (err) {
          logger.warn('Failed to delete photo file:', err.message);
        }
      }
    }

    await db.collection('products').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          photo: null,
          lastModifiedBy: userId || null,
          lastModifiedByUsername: username || 'Unknown',
          lastModified: new Date()
        },
        $unset: {
          photoFilename: "",
          photoDbId: "",
          photoStorage: ""
        }
      }
    );
    
    // Log audit trail
    await logAudit(db, 'PRODUCT_PHOTO_DELETED', userId, username, {
      productId: id,
      productName: product.name
    });
    
    res.json({ success: true, message: 'Product photo deleted successfully' });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Serve product photo (file-system or DB-backed)
app.get('/api/products/:id/photo', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();
    const product = await db.collection('products').findOne({ _id: new ObjectId(id) });

    if (!product) return res.status(404).json({ error: 'Product not found' });

    // If DB-backed image
    if (product.photoStorage === 'db' || product.photoDbId) {
      const imgId = product.photoDbId || String(product.photo || '').replace(/^db:/, '');
      if (!imgId) return res.status(404).json({ error: 'No DB-stored photo found' });

      const imgDoc = await db.collection('product_images').findOne({ _id: new ObjectId(imgId) });
      if (!imgDoc) return res.status(404).json({ error: 'Image data not found' });

      res.setHeader('Content-Type', imgDoc.contentType || 'application/octet-stream');
      // cache images for a short time
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(imgDoc.data.buffer ? Buffer.from(imgDoc.data.buffer) : imgDoc.data);
    }

    // Filesystem-backed image
    const filename = product.photoFilename || (product.photo && path.basename(product.photo));
    if (!filename) return res.status(404).json({ error: 'No photo available for this product' });

    const imgPath = path.join(__dirname, 'uploads', 'products', filename);
    return res.sendFile(imgPath, err => {
      if (err) {
        logger.warn('Failed to send image file:', err.message);
        res.status(404).json({ error: 'Image not found' });
      }
    });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Add Customer
app.post('/api/customers', async (req, res) => {
  try {
    const { name, phone, address, gstin, place, pincode, userId, username } = req.body;
    
    // Validate customer data
    const customerData = { name, phone, address, gstin, place };
    const validationErrors = validateCustomer(customerData);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors.join(', ') });
    }
    
    const db = getDB();
    
    const cardNumber = `LC${Math.floor(100000000000 + Math.random() * 899999999999)}`;
    const customer = {
      name: sanitizeObject(name),
      phone: phone ? sanitizeObject(phone) : '',
      address: address ? sanitizeObject(address) : '',
      place: place ? sanitizeObject(place) : '',
      pincode: pincode ? sanitizeObject(pincode) : '',
      gstin: gstin ? sanitizeObject(gstin) : '',
      // Loyalty functionality removed — do not set loyalty defaults
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

// Get Invoices
app.get('/api/invoices', async (req, res) => {
  try {
    const db = getDB();
    const bills = await db.collection('bills')
      .find({})
      .sort({ billDate: -1 })
      .limit(100)
      .toArray();
    
    const formatted = bills.map(bill => ({
      id: bill._id.toString(),
      customer_id: bill.customerId ? bill.customerId.toString() : null,
      customer_name: bill.customerName || 'Walk-in',
      customerPhone: bill.customerPhone || null,
      customerPlace: bill.customerPlace || bill.customer_place || null,
      customerPincode: bill.customerPincode || bill.customer_pincode || null,
      customerAddress: bill.customerAddress || null,
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
      totalProfit: bill.totalProfit || 0,
      // loyaltyApplied and loyaltyIssued removed from invoice mapping
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
      createdByUsername: bill.createdByUsername || 'Unknown',
      companyPhone: bill.companyPhone || process.env.COMPANY_PHONE || '7594012761',
      billNumber: bill.billNumber || bill._id.toString()
    }));
    
    res.json(formatted);
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Admin endpoint: Update company phone in all invoices
app.post('/api/admin/update-company-phone', async (req, res) => {
  try {
    const { adminUsername, adminPassword, companyPhone } = req.body;
    if (!adminUsername || !adminPassword || !companyPhone) return res.status(400).json({ error: 'adminUsername, adminPassword and companyPhone are required' });
    const db = getDB();
    const admin = await db.collection('users').findOne({ username: adminUsername.toLowerCase(), role: 'admin' });
    if (!admin) return res.status(403).json({ error: 'Admin user not found' });
    const match = await bcrypt.compare(adminPassword, admin.password);
    if (!match) return res.status(401).json({ error: 'Invalid admin password' });

    // Validate phone format (basic validation)
    const normalizedPhone = String(companyPhone).trim();
    const phoneRegex = /^[0-9+\-()\s]{6,30}$/;
    if (!phoneRegex.test(normalizedPhone)) return res.status(400).json({ error: 'Invalid phone number format' });

    // Update all bills
    const result = await db.collection('bills').updateMany({}, { $set: { companyPhone: normalizedPhone } });
    await logAudit(db, 'ADMIN_UPDATE_COMPANY_PHONE', admin._id.toString(), admin.username, { companyPhone, matched: result.matchedCount, modified: result.modifiedCount });
    res.json({ success: true, message: `Updated ${result.modifiedCount} invoices with companyPhone ${companyPhone}` });
  } catch (e) {
    logger.error('Update company phone failed', e);
    res.status(500).json({ error: 'Failed to update companyPhone', details: e.message });
  }
});

// Create a short-lived public link for an invoice (customers can open without auth)
app.post('/api/invoices/:id/public', async (req, res) => {
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
      companySnapshot: req.body.company || null
    });

    const base = process.env.PUBLIC_BASE_URL || (req.protocol + '://' + req.get('host'));
    const publicUrl = `${base}/public/invoice/${token}`;

    // Log audit
    await logAudit(db, 'PUBLIC_INVOICE_LINK_CREATED', null, req.body.requestedBy || 'system', { invoiceId: invoice._id.toString(), token });

    res.json({ publicUrl, token, expiresAt });
  } catch (e) {
    logger.error('Create public invoice link failed', e);
    res.status(500).json({ error: 'Failed to create public link' });
  }
});

// Public invoice view by token
app.get('/public/invoice/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const db = getDB();

    const entry = await db.collection('public_invoice_links').findOne({ token });
    if (!entry) return res.status(404).send('Link not found');
    if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
      return res.status(410).send('Link expired');
    }

    const invoiceId = entry.invoiceId;
    let invoice = null;
    try {
      invoice = await db.collection('bills').findOne({ _id: new ObjectId(invoiceId) });
    } catch (e) {}
    if (!invoice) invoice = await db.collection('bills').findOne({ billNumber: invoiceId });
    if (!invoice) return res.status(404).send('Invoice not found');

    // Public printable invoice page (styling similar to printable bill)
    res.set('Content-Type', 'text/html');
    const companySnapshot = entry.companySnapshot || {};
    const companyName = companySnapshot.name || invoice.companyName || process.env.COMPANY_NAME || 'My Shop';
    const companyPhone = companySnapshot.phone || invoice.companyPhone || process.env.COMPANY_PHONE || '7594012761';
    const companyAddress = companySnapshot.address || invoice.companyAddress || process.env.COMPANY_ADDRESS || '';
    const companyEmail = companySnapshot.email || invoice.companyEmail || process.env.COMPANY_EMAIL || '';
    const companyGSTIN = companySnapshot.gstin || invoice.companyGst || process.env.COMPANY_GSTIN || '';
    const invoiceDate = invoice.billDate || invoice.created_at || invoice.date || new Date().toISOString();

    res.send(`<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>Invoice ${invoice.billNumber || invoice._id}</title>
          <style>
            :root { --maxw: 842px; --page-bg: #f7fafc; }
            html,body{height:100%;}
            body{font-family:Segoe UI,Arial,sans-serif;padding:20px;background:var(--page-bg);color:#111}
            .paper{background:#fff;max-width:760px;margin:16px auto;padding:20px;border-radius:6px;box-shadow:0 6px 20px rgba(0,0,0,.08)}
            .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}
            .company{font-size:20px;font-weight:700;color:#222}
            .meta{font-size:13px;color:#444;text-align:right}
            .customer{display:flex;justify-content:space-between;margin-bottom:12px}
            table{width:100%;border-collapse:collapse;margin-top:8px}
            th,td{padding:8px;border-bottom:1px solid #eee;text-align:left;font-size:13px}
            th{background:#fafafa;font-weight:700}
            tfoot td{border-top:2px solid #ddd;font-weight:700}
            .totals{margin-top:12px;display:flex;justify-content:flex-end;gap:12px}
            .totals .col{min-width:220px;background:#fafafa;padding:10px;border-radius:6px}
            .print-cta{margin-top:16px;text-align:center}
            .small{font-size:12px;color:#666}
            @media print{ body{background:white} .paper{box-shadow:none;border-radius:0} .print-cta{display:none} }
          </style>
        </head>
        <body>
          <div class="paper">
            <div class="header">
              <div style="flex:1;">
                <div style="font-size:36px;margin-bottom:6px;">⚡</div>
                <div class="company">${companyName}</div>
                <div class="small">${companyAddress}</div>
                <div class="small">Phone: ${companyPhone || '—'} ${companyEmail ? ' | Email: ' + companyEmail : ''}</div>
                ${companyGSTIN ? `<div class="small">GSTIN: ${companyGSTIN}</div>` : ''}
              </div>
              <div class="meta" style="text-align:right;min-width:240px;">
                <div><strong style="font-size:18px;padding:8px 12px;background:#111;color:#fff;display:inline-block;letter-spacing:2px">TAX INVOICE</strong></div>
                <div style="margin-top:10px">Invoice: <strong>${invoice.billNumber || invoice._id}</strong></div>
                <div>Date: ${new Date(invoiceDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</div>
                <div>Time: ${new Date(invoiceDate).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}</div>
              </div>
            </div>

            <div class="customer">
              <div>
                <div><strong>Customer</strong></div>
                <div>${invoice.customerName || invoice.customer || invoice.customer_name || 'Walk-in'}</div>
                ${ (invoice.customerPlace || invoice.customer_place) ? `<div class="small">Place: ${invoice.customerPlace || invoice.customer_place}</div>` : '' }
                ${ (invoice.customerPincode || invoice.customer_pincode) ? `<div class="small">PIN: ${invoice.customerPincode || invoice.customer_pincode}</div>` : '' }
                ${ (invoice.customerPhone || invoice.customer_phone) ? `<div class="small">Phone: ${invoice.customerPhone || invoice.customer_phone}</div>` : '' }
                ${ (invoice.customerAddress || invoice.customer_address) ? `<div class="small">${invoice.customerAddress || invoice.customer_address}</div>` : '' }
              </div>
              <div style="text-align:right">
                <div><strong class="small">Salesperson</strong></div>
                <div class="small">${invoice.username || invoice.seller || '—'}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr><th style="width:50px">S.No</th><th>Item</th><th style="width:70px;text-align:right">Qty</th><th style="width:120px;text-align:right">Rate (₹)</th><th style="width:120px;text-align:right">Amount (₹)</th></tr>
              </thead>
              <tbody>
                ${ (invoice.items || []).map((it, idx) => {
                  const name = (it.productName || it.name || 'Item').toString().slice(0, 200);
                  const qty = Number(it.quantity || it.qty || 0);
                  const rate = Number(it.unitPrice || it.price || it.rate || 0).toFixed(2);
                  const amount = (qty * Number(it.unitPrice || it.price || it.rate || 0)).toFixed(2);
                  return `<tr><td style="vertical-align:middle">${idx+1}</td><td>${name}</td><td style="text-align:right">${qty}</td><td style="text-align:right">${Number(rate).toFixed(2)}</td><td style="text-align:right">${amount}</td></tr>`;
                }).join('') }
              </tbody>
            </table>

            <div class="totals">
              <div class="col">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px"><div class="small">Subtotal</div><div>₹${Number(invoice.subtotal || invoice.totalBeforeTax || 0).toFixed(2)}</div></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px"><div class="small">Discount ${invoice.discountPercent ? '(' + invoice.discountPercent + '%)' : ''}</div><div>- ₹${Number(invoice.discountAmount || 0).toFixed(2)}</div></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px"><div class="small">After Discount</div><div>₹${Number(invoice.afterDiscount || ((invoice.subtotal || invoice.totalBeforeTax || 0) - (invoice.discountAmount || 0))).toFixed(2)}</div></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px"><div class="small">GST (${invoice.taxRate || 18}%):</div><div>₹${Number(invoice.gstAmount || invoice.taxAmount || 0).toFixed(2)}</div></div>
                <div style="display:flex;justify-content:space-between;border-top:1px dashed #ddd;padding-top:8px;margin-top:8px; font-weight:700"><div>Grand Total</div><div>₹${Number(invoice.grandTotal || invoice.total || 0).toFixed(2)}</div></div>
              </div>
            </div>

            <!-- Amount in words, terms and signature similar to client printable bill -->
            <div style="margin-top:14px;padding:12px;background:#f9f9f9;border:1px dashed #ccc">
              <strong>Amount in Words: </strong><span id="amount-in-words">${''}</span>
            </div>

            <div style="margin-top:14px;background:#fff;padding:10px;border:1px dotted #ccc">
              <strong>Terms & Conditions:</strong>
              <ol style="margin-top:6px;color:#444">
                <li>Goods once sold cannot be returned or exchanged.</li>
                <li>Payment is due at the time of purchase.</li>
                <li>Subject to local jurisdiction only.</li>
                <li>E. &amp; O.E. (Errors and Omissions Excepted)</li>
              </ol>
            </div>

            <div style="display:flex;justify-content:space-between;margin-top:24px">
              <div style="text-align:center;width:45%"><div style="border-top:1px solid #000;padding-top:10px;">Customer Signature</div></div>
              <div style="text-align:center;width:45%"><div style="border-top:1px solid #000;padding-top:10px;">Authorized Signatory</div></div>
            </div>

            <div style="margin-top:14px" class="small">This link expires on ${entry.expiresAt ? new Date(entry.expiresAt).toLocaleDateString() + ', ' + new Date(entry.expiresAt).toLocaleTimeString() : '—'}</div>

            <div class="print-cta"><button onclick="window.print()" style="padding:8px 14px;border-radius:6px;background:#111;color:#fff;border:none;cursor:pointer;margin-top:12px">Print / Save PDF</button></div>

            <script>
              // Render amount in words (small client-side helper)
              (function(){
                function numberToWords(num){
                  const ones=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine'];
                  const teens=['Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
                  const tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
                  function convertHundreds(n){
                    let s='';
                    if(n>99){ s += ones[Math.floor(n/100)] + ' Hundred '; n = n%100 }
                    if(n>19){ s += tens[Math.floor(n/10)] + ' '; n = n%10 }
                    else if(n>=10){ s += teens[n-10] + ' '; return s.trim() }
                    s += ones[n] + ' ';
                    return s.trim();
                  }
                  if(num===0) return 'Zero';
                  if(num>=10000000) return convertHundreds(Math.floor(num/10000000)) + ' Crore ' + numberToWords(num%10000000);
                  if(num>=100000) return convertHundreds(Math.floor(num/100000)) + ' Lakh ' + numberToWords(num%100000);
                  if(num>=1000) return convertHundreds(Math.floor(num/1000)) + ' Thousand ' + numberToWords(num%1000);
                  return convertHundreds(num);
                }
                const total = ${Number(invoice.grandTotal || invoice.total || 0).toFixed(0)};
                const el = document.getElementById('amount-in-words');
                if(el) el.innerText = numberToWords(total) + ' Rupees Only';
              })();
            </script>

            <div style="margin-top:14px" class="small">This link expires on ${entry.expiresAt ? new Date(entry.expiresAt).toLocaleString() : '—'}</div>
            <div class="print-cta"><button onclick="window.print()">Print / Save PDF</button></div>
          </div>
        </body>
      </html>`);

  } catch (e) {
    logger.error('Public invoice serve error', e);
    res.status(500).send('Server error');
  }
});

// Server-side invoice PDF generation endpoint removed — server will no longer generate invoices as attachments.

// Get Stats
app.get('/api/stats', async (req, res) => {
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

// ==================== AUDIT TRAIL SYSTEM ====================

// Helper function to log user actions
async function logAudit(db, action, userId, username, details = {}) {
  try {
    const auditLog = {
      action,
      userId: userId ? new ObjectId(userId) : null,
      username: username || 'System',
      timestamp: new Date(),
      details,
      ipAddress: null // Can be enhanced to capture IP
    };
    
    await db.collection('audit_logs').insertOne(auditLog);
  } catch (e) {
    logger.error('Audit logging error:', e);
  }
}

// Get Audit Logs (Admin Only)
app.get('/api/audit-logs', async (req, res) => {
  try {
    const db = getDB();
    const limit = parseInt(req.query.limit) || 100;
    const action = req.query.action; // Filter by action type
    
    let query = {};
    if (action) {
      query.action = action;
    }
    
    const logs = await db.collection('audit_logs')
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
    
    const formatted = logs.map(log => ({
      id: log._id.toString(),
      action: log.action,
      userId: log.userId ? log.userId.toString() : null,
      username: log.username,
      timestamp: log.timestamp,
      details: log.details
    }));
    
    res.json(formatted);
  } catch (e) {
    logger.error('Get audit logs error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get User Activity Summary (Admin Only)
app.get('/api/audit-logs/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const db = getDB();
    
    const logs = await db.collection('audit_logs')
      .find({ userId: new ObjectId(userId) })
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();
    
    const summary = await db.collection('audit_logs').aggregate([
      { $match: { userId: new ObjectId(userId) } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    res.json({
      recentActivity: logs.map(log => ({
        id: log._id.toString(),
        action: log.action,
        timestamp: log.timestamp,
        details: log.details
      })),
      summary: summary.map(s => ({
        action: s._id,
        count: s.count
      }))
    });
  } catch (e) {
    logger.error('Get user activity error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ==================== USER MANAGEMENT ENDPOINTS ====================

// OTP ENDPOINTS REMOVED - Direct registration enabled

// Step 1: Send OTP to email [DISABLED]
/* app.post('/api/users/send-otp', async (req, res) => {
  console.log('📧 Received OTP request for:', req.body.email);
  try {
    const { email } = req.body;
    
    if (!email) {
      console.log('❌ No email provided');
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Invalid email format:', email);
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const db = getDB();
    console.log('✅ Database connected');
    
    // Check if email already registered
    const existingEmail = await db.collection('users').findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    console.log('\n========================================');
    console.log('🔢 GENERATED OTP:', otp);
    console.log('📧 For Email:', email);
    console.log('⏰ Expires At:', expiresAt.toLocaleString());
    console.log('========================================\n');

    // Store OTP in database
    await db.collection('otps').deleteMany({ email: email.toLowerCase() }); // Remove old OTPs
    await db.collection('otps').insertOne({
      email: email.toLowerCase(),
      otp: otp,
      expiresAt: expiresAt,
      verified: false,
      createdAt: new Date()
    });
    console.log('💾 OTP stored in database');

    // OTP generation complete - Email sending disabled
    console.log('\n📤 OTP generated successfully');
    console.log('   OTP:', otp);
    console.log('   For:', email);
    
    // Success response - Return OTP directly since email is disabled
      res.json({ 
        success: true, 
        message: 'OTP sent successfully! Check your email inbox (and spam folder).',
        expiresIn: 600,
        emailSent: true
      });
      
    } catch (emailError) {
      logger.error('\n❌❌❌ EMAIL FAILED TO SEND ❌❌❌');
      logger.error('Error Message:', emailError.message);
      logger.error('Error Code:', emailError.code);
      logger.error('Command:', emailError.command);
      
      // Still return success but warn user
      res.json({ 
        success: true, 
        message: `OTP generated but email failed. Your OTP is: ${otp} (Check server logs)`,
        expiresIn: 600,
        otp: otp, // Show OTP since email failed
        emailSent: false,
        emailError: emailError.message
      });
    }
  } catch (e) {
    logger.error('Send OTP error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Step 2: Verify OTP
app.post('/api/users/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const db = getDB();
    
    // Find OTP record
    const otpRecord = await db.collection('otps').findOne({ 
      email: email.toLowerCase(),
      otp: otp 
    });

    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Check if OTP expired
    if (new Date() > otpRecord.expiresAt) {
      await db.collection('otps').deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
    }

    // Mark as verified
    await db.collection('otps').updateOne(
      { _id: otpRecord._id },
      { $set: { verified: true } }
    );

    res.json({ 
      success: true, 
      message: 'Email verified successfully!' 
    });
  } catch (e) {
    logger.error('Verify OTP error:', e);
    res.status(500).json({ error: e.message });
  }
});

*/ // End of disabled OTP endpoints

// Register User (Direct - No OTP Required)
app.post('/api/users/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    
    // Validate user registration data
    const userData = { username, password, email };
    const validationErrors = validateUserRegistration(userData);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors.join(', ') });
    }
    
    const db = getDB();
    
    // Direct registration (No OTP verification required)
    
    // Check if username already exists
    const existingUser = await db.collection('users').findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user (sanitize inputs). Email is required now (collected at registration).
    const user = {
      username: sanitizeObject(username.toLowerCase()),
      password: hashedPassword,
      // Email was validated earlier — store the sanitized normalized value
      email: sanitizeObject(email.toLowerCase()),
      role: 'user',
      approved: false,
      createdAt: new Date(),
      lastLogin: null,
      sessionVersion: 1
    };
    
    const result = await db.collection('users').insertOne(user);
    
    res.json({
      success: true,
      message: 'Registration successful! Please wait for admin approval.',
      user: {
        id: result.insertedId.toString(),
        username: user.username,
        email: user.email,
        approved: user.approved
      }
    });
  } catch (e) {
    logger.error('Registration error:', e);
    res.status(500).json({ error: e.message });
  }
});

// User Login
app.post('/api/users/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const db = getDB();
    
    // Find user
    const user = await db.collection('users').findOne({ username: username.toLowerCase() });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Check if approved
    if (!user.approved) {
      return res.status(403).json({ 
        error: 'Your account is pending admin approval',
        approved: false
      });
    }
    
    // Update last login
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    );
    
    const base = process.env.PUBLIC_BASE_URL || (req.protocol + '://' + req.get('host'));
    res.json({
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        approved: user.approved,
        sessionVersion: user.sessionVersion || 1,
        photo: (user.photo && typeof user.photo === 'string') ? (user.photo.startsWith('http') ? user.photo : `${base}/api/users/${user._id.toString()}/photo`) : null
      }
    });
  } catch (e) {
    logger.error('Login error:', e);
    res.status(500).json({ error: e.message });
  }
});



// Get All Users (Admin Only)
app.get('/api/users', async (req, res) => {
  try {
    const db = getDB();
    const base = process.env.PUBLIC_BASE_URL || (req.protocol + '://' + req.get('host'));
    
    const users = await db.collection('users')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    
    const formatted = users.map(u => ({
      _id: u._id.toString(),
      username: u.username,
      email: u.email,
      role: u.role,
      // Expose a stable server-backed avatar endpoint when a photo exists
      photo: (u.photo && typeof u.photo === 'string')
        ? (u.photo.startsWith('http') ? u.photo : `${base}/api/users/${u._id.toString()}/photo`)
        : null,
      approved: u.approved,
      sessionVersion: u.sessionVersion || 1,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin
    }));
    
    res.json(formatted);
  } catch (e) {
    logger.error('Get users error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Approve User (Admin Only)
app.patch('/api/users/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();
    
    await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: { approved: true } }
    );
    
    res.json({ success: true, message: 'User approved successfully' });
  } catch (e) {
    logger.error('Approve user error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Unapprove User (Admin Only) - Revoke access without deleting
app.patch('/api/users/:id/unapprove', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();
    
    await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: { approved: false } }
    );
    
    res.json({ success: true, message: 'User access revoked successfully' });
  } catch (e) {
    logger.error('Unapprove user error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Change User Role (Admin Only)
app.patch('/api/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const db = getDB();
    
    // Validate role
    const validRoles = ['admin', 'manager', 'cashier'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, manager, or cashier.' });
    }
    
    // Update user role
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: { role: role } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    logger.info(`User role updated: ${id} -> ${role}`);
    res.json({ success: true, message: 'User role updated successfully', role: role });
  } catch (e) {
    logger.error('Change user role error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Delete User (Admin Only)
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();
    
    // Get user info before deleting
    const userToDelete = await db.collection('users').findOne({ _id: new ObjectId(id) });
    
    if (!userToDelete) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await db.collection('users').deleteOne({ _id: new ObjectId(id) });
    
    res.json({ 
      success: true, 
      message: 'User deleted successfully',
      deletedUserId: id,
      deletedUsername: userToDelete.username
    });
  } catch (e) {
    logger.error('Delete user error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Check if user account still exists and is approved (for session validation)
app.get('/api/users/check/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();
    
    const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
    
    if (!user) {
      return res.json({ 
        exists: false, 
        approved: false,
        message: 'User account not found'
      });
    }
    
    res.json({ 
      exists: true, 
      approved: user.approved,
      username: user.username
    });
  } catch (e) {
    logger.error('Check user error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get a user's current sessionVersion (used by clients to validate sessions)
app.get('/api/users/:username/session', async (req, res) => {
  try {
    const { username } = req.params;
    const db = getDB();
    const user = await db.collection('users').findOne({ username: username.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ username: user.username, sessionVersion: user.sessionVersion || 1 });
  } catch (e) {
    logger.error('Error fetching user sessionVersion:', e);
    res.status(500).json({ error: e.message });
  }
});

// Admin: change admin password and optionally invalidate all sessions
// Guard: admin password changes via the web API are disabled by default.
// Set ALLOW_ADMIN_PASSWORD_CHANGE=true in the server environment to enable.
const ALLOW_ADMIN_PASSWORD_CHANGE = process.env.ALLOW_ADMIN_PASSWORD_CHANGE === 'true';

app.post('/api/admin/change-password', async (req, res) => {
  if (!ALLOW_ADMIN_PASSWORD_CHANGE) return res.status(403).json({ error: 'Admin password change via API is disabled. Enable by setting ALLOW_ADMIN_PASSWORD_CHANGE=true.' });
  try {
    const { adminUsername, currentPassword, newPassword, logoutAll } = req.body;
    if (!adminUsername || !currentPassword || !newPassword) return res.status(400).json({ error: 'Missing required fields' });

    const db = getDB();
    const admin = await db.collection('users').findOne({ username: adminUsername.toLowerCase(), role: 'admin' });
    if (!admin) return res.status(403).json({ error: 'Admin user not found' });

    // Verify current password
    const match = await bcrypt.compare(currentPassword, admin.password);
    if (!match) return res.status(401).json({ error: 'Current admin password incorrect' });

    // Update password
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.collection('users').updateOne({ _id: admin._id }, { $set: { password: hashed }, $inc: { sessionVersion: 1 } });

    // Optionally invalidate all sessions across users
    if (logoutAll) {
      await db.collection('users').updateMany({}, { $inc: { sessionVersion: 1 } });
      await logAudit(db, 'ADMIN_PASSWORD_CHANGED_INVALIDATE_ALL', null, adminUsername, { message: 'Admin changed password and logged out all sessions' });
    } else {
      await logAudit(db, 'ADMIN_PASSWORD_CHANGED', null, adminUsername, { message: 'Admin changed password' });
    }

    res.json({ success: true, message: 'Admin password updated successfully' });
  } catch (e) {
    logger.error('Change password error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Admin: invalidate a specific user's sessions (increment sessionVersion)
app.post('/api/users/:username/invalidate', async (req, res) => {
  try {
    const target = req.params.username;
    const { adminUsername, adminPassword } = req.body;
    if (!adminUsername || !adminPassword) return res.status(400).json({ error: 'Admin credentials required' });

    const db = getDB();
    const admin = await db.collection('users').findOne({ username: adminUsername.toLowerCase(), role: 'admin' });
    if (!admin) return res.status(403).json({ error: 'Admin user not found' });
    const match = await bcrypt.compare(adminPassword, admin.password);
    if (!match) return res.status(401).json({ error: 'Invalid admin password' });

    const targetUser = await db.collection('users').findOne({ username: target.toLowerCase() });
    if (!targetUser) return res.status(404).json({ error: 'Target user not found' });

    await db.collection('users').updateOne({ _id: targetUser._id }, { $inc: { sessionVersion: 1 } });
    await logAudit(db, 'USER_SESSION_INVALIDATED', null, adminUsername, { target: targetUser.username });
    res.json({ success: true, message: `Invalidated sessions for ${targetUser.username}` });
  } catch (e) {
    logger.error('Invalidate session error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Upload user profile photo (filesystem or DB storage)
app.post('/api/users/:id/photo', upload.single('photo'), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, username } = req.body; // admin performing action
    if (!req.file) return res.status(400).json({ error: 'No photo uploaded' });

    const db = getDB();
    const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
    if (!user) {
      try { await fs.unlink(req.file.path); } catch(e) {}
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete previous photo record if exists
    if (user.photo) {
      try {
        if (user.photoStorage === 'db' || user.photoDbId) {
          const photoId = user.photoDbId || String(user.photo).replace(/^db:/, '');
          if (photoId) await db.collection('user_images').deleteOne({ _id: new ObjectId(photoId) });
        } else {
          const filename = user.photoFilename || (user.photo && path.basename(user.photo));
          if (filename) await fs.unlink(path.join(__dirname, 'uploads', 'users', filename));
        }
      } catch (err) { logger.warn('Failed to delete old user photo:', err.message); }
    }

    // Ensure upload dir exists
    await fs.mkdir(path.join(__dirname, 'uploads', 'users'), { recursive: true });

    // Build fully-qualified photo URL so clients can use it directly
    const base = process.env.PUBLIC_BASE_URL || (req.protocol + '://' + req.get('host'));
    let photoUrl = `${base}/api/users/${id}/photo`;
    const storageMode = String(req.query.storage || '').toLowerCase();
    const useDbStorage = (storageMode !== 'fs'); // default to DB
    if (useDbStorage) {
      const buffer = await fs.readFile(req.file.path);
      const imgDoc = {
        userId: new ObjectId(id),
        filename: req.file.originalname || req.file.filename,
        contentType: req.file.mimetype || 'application/octet-stream',
        data: buffer,
        uploadedAt: new Date()
      };
      const imgResult = await db.collection('user_images').insertOne(imgDoc);
      try { await fs.unlink(req.file.path); } catch(e){}

      await db.collection('users').updateOne(
        { _id: new ObjectId(id) },
        { $set: { photo: photoUrl, photoStorage: 'db', photoDbId: imgResult.insertedId.toString(), lastModified: new Date(), lastModifiedBy: userId || null, lastModifiedByUsername: username || 'Unknown' } }
      );
    } else {
      // filesystem-backed
      await db.collection('users').updateOne(
        { _id: new ObjectId(id) },
        { $set: { photo: photoUrl, photoStorage: 'fs', photoFilename: req.file.filename, lastModified: new Date(), lastModifiedBy: userId || null, lastModifiedByUsername: username || 'Unknown' } }
      );
    }

    await logAudit(db, 'USER_PHOTO_UPDATED', userId || null, username || 'system', { userId: id });

    res.json({ success: true, photo: photoUrl, message: 'User photo uploaded' });
  } catch (e) {
    logger.error('User photo upload error:', e);
    if (req.file) { try{ await fs.unlink(req.file.path); }catch(_){} }
    res.status(500).json({ error: e.message });
  }
});

// Delete user profile photo
app.delete('/api/users/:id/photo', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, username } = req.query;
    const db = getDB();

    const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.photo) {
      if (String(user.photo).startsWith('db:') || user.photoDbId) {
        const photoId = user.photoDbId || String(user.photo).replace(/^db:/, '');
        if (photoId) await db.collection('user_images').deleteOne({ _id: new ObjectId(photoId) });
      } else {
        try { await fs.unlink(path.join(__dirname, 'uploads', 'users', path.basename(user.photo))); } catch (err) { logger.warn('Failed to delete user photo file:', err.message); }
      }
    }

    await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: { photo: null, lastModified: new Date(), lastModifiedBy: userId || null, lastModifiedByUsername: username || 'Unknown' }, $unset: { photoFilename: '', photoDbId: '', photoStorage: '' } }
    );

    await logAudit(db, 'USER_PHOTO_DELETED', userId || null, username || 'system', { userId: id });

    res.json({ success: true, message: 'User photo deleted' });
  } catch (e) {
    logger.error('Delete user photo error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Serve user profile photo (filesystem or DB-backed)
app.get('/api/users/:id/photo', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();
    const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.photoStorage === 'db' || user.photoDbId) {
      const imgId = user.photoDbId || String(user.photo || '').replace(/^db:/, '');
      if (!imgId) return res.status(404).json({ error: 'No DB-stored photo' });
      const imgDoc = await db.collection('user_images').findOne({ _id: new ObjectId(imgId) });
      if (!imgDoc) return res.status(404).json({ error: 'Image not found' });
      res.setHeader('Content-Type', imgDoc.contentType || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(imgDoc.data.buffer ? Buffer.from(imgDoc.data.buffer) : imgDoc.data);
    }

    const filename = user.photoFilename || (user.photo && path.basename(user.photo));
    if (!filename) return res.status(404).json({ error: 'No photo available' });
    const imgPath = path.join(__dirname, 'uploads', 'users', filename);
    return res.sendFile(imgPath, err => {
      if (err) { logger.warn('Failed to send user photo:', err.message); res.status(404).json({ error: 'Image not found' }); }
    });
  } catch (e) {
    logger.error('Serve user photo error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Admin: Migrate existing user/product photo fields to fully-qualified URLs
app.post('/api/admin/migrate-photo-urls', async (req, res) => {
  try {
    const { adminUsername, adminPassword } = req.body;
    if (!adminUsername || !adminPassword) return res.status(400).json({ error: 'Admin credentials required' });

    const db = getDB();
    const admin = await db.collection('users').findOne({ username: adminUsername.toLowerCase(), role: 'admin' });
    if (!admin) return res.status(403).json({ error: 'Admin user not found' });
    const match = await bcrypt.compare(adminPassword, admin.password);
    if (!match) return res.status(401).json({ error: 'Invalid admin password' });

    const base = process.env.PUBLIC_BASE_URL || (req.protocol + '://' + req.get('host'));

    // Migrate users
    const users = await db.collection('users').find({}).toArray();
    let usersUpdated = 0;
    for (const u of users) {
      try {
        if (!u.photo) continue;
        // db: or db-backed: resolve to fully-qualified endpoint
        if (u.photoStorage === 'db' || u.photoDbId || String(u.photo).startsWith('db:') || String(u.photo).startsWith('http')) {
          // if it's already a fully-qualified URL, skip
          if (String(u.photo).startsWith('http')) continue;
          await db.collection('users').updateOne({ _id: u._id }, { $set: { photo: `${base}/api/users/${u._id.toString()}/photo` } });
          usersUpdated++;
        } else {
          // filesystem or relative local path - rewrite to the API endpoint
          if (!String(u.photo).startsWith('http')) {
            await db.collection('users').updateOne({ _id: u._id }, { $set: { photo: `${base}/api/users/${u._id.toString()}/photo` } });
            usersUpdated++;
          }
        }
      } catch (e) { logger.warn('Failed to migrate user photo for', u._id, e.message) }
    }

    // Migrate products
    const products = await db.collection('products').find({}).toArray();
    let productsUpdated = 0;
    for (const p of products) {
      try {
        if (!p.photo) continue;
        if (p.photoStorage === 'db' || p.photoDbId || String(p.photo).startsWith('db:') || String(p.photo).startsWith('http')) {
          if (String(p.photo).startsWith('http')) continue;
          await db.collection('products').updateOne({ _id: p._id }, { $set: { photo: `${base}/api/products/${p._id.toString()}/photo` } });
          productsUpdated++;
        } else {
          if (!String(p.photo).startsWith('http')) {
            await db.collection('products').updateOne({ _id: p._id }, { $set: { photo: `${base}/api/products/${p._id.toString()}/photo` } });
            productsUpdated++;
          }
        }
      } catch (e) { logger.warn('Failed to migrate product photo for', p._id, e.message) }
    }

    await logAudit(db, 'MIGRATE_PHOTO_URLS', admin._id.toString(), admin.username, { usersUpdated, productsUpdated });

    res.json({ success: true, usersUpdated, productsUpdated, message: `Migrated ${usersUpdated} user photos and ${productsUpdated} product photos.` });
  } catch (e) {
    logger.error('Migrate photo URLs error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Admin endpoint: Migrate filesystem-backed photos into DB storage
app.post('/api/admin/migrate-photos-to-db', async (req, res) => {
  try {
    const { adminUsername, adminPassword, deleteFiles } = req.body;
    if (!adminUsername || !adminPassword) return res.status(400).json({ error: 'Admin credentials required' });
    const db = getDB();
    const admin = await db.collection('users').findOne({ username: adminUsername.toLowerCase(), role: 'admin' });
    if (!admin) return res.status(403).json({ error: 'Admin user not found' });
    const match = await bcrypt.compare(adminPassword, admin.password);
    if (!match) return res.status(401).json({ error: 'Invalid admin password' });

    const base = process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 4000}`;

    let productsUpdated = 0;
    const products = await db.collection('products').find({ $or: [ { photoStorage: { $ne: 'db' } }, { photoFilename: { $exists: true } } ] }).toArray();
    for (const p of products) {
      try {
        const filename = p.photoFilename || (p.photo && path.basename(p.photo));
        if (!filename) continue;
        const photoPath = path.join(__dirname, 'uploads', 'products', filename);
        if (!fsSync.existsSync(photoPath)) continue;
        const buffer = await fs.readFile(photoPath);
        const imgDoc = { productId: p._id, filename, contentType: 'image/jpeg', data: buffer, uploadedAt: new Date() };
        const imgRes = await db.collection('product_images').insertOne(imgDoc);
        await db.collection('products').updateOne({ _id: p._id }, { $set: { photo: `${base}/api/products/${p._id.toString()}/photo`, photoStorage: 'db', photoDbId: imgRes.insertedId.toString() } });
        if (deleteFiles) try { await fs.unlink(photoPath); } catch (e) { /* ignore */ }
        productsUpdated++;
      } catch (e) { logger.warn('Failed to migrate product photo:', e.message); continue; }
    }

    let usersUpdated = 0;
    const users = await db.collection('users').find({ $or: [ { photoStorage: { $ne: 'db' } }, { photoFilename: { $exists: true } } ] }).toArray();
    for (const u of users) {
      try {
        const filename = u.photoFilename || (u.photo && path.basename(u.photo));
        if (!filename) continue;
        const photoPath = path.join(__dirname, 'uploads', 'users', filename);
        if (!fsSync.existsSync(photoPath)) continue;
        const buffer = await fs.readFile(photoPath);
        const imgDoc = { userId: u._id, filename, contentType: 'image/jpeg', data: buffer, uploadedAt: new Date() };
        const imgRes = await db.collection('user_images').insertOne(imgDoc);
        await db.collection('users').updateOne({ _id: u._id }, { $set: { photo: `${base}/api/users/${u._id.toString()}/photo`, photoStorage: 'db', photoDbId: imgRes.insertedId.toString() } });
        if (deleteFiles) try { await fs.unlink(photoPath); } catch (e) { /* ignore */ }
        usersUpdated++;
      } catch (e) { logger.warn('Failed to migrate user photo:', e.message); continue; }
    }

    await logAudit(db, 'ADMIN_MIGRATE_PHOTOS_TO_DB', admin._id.toString(), admin.username, { productsUpdated, usersUpdated, deleteFiles: !!deleteFiles });
    res.json({ success: true, message: `Migrated ${productsUpdated} product photos and ${usersUpdated} user photos to DB` });
  } catch (e) {
    logger.error('Migrate photos to DB failed', e);
    res.status(500).json({ error: 'Failed to migrate photos to DB', details: e.message });
  }
});

// Admin: Issue loyalty cards endpoint removed per request

// ==================== ANALYTICS ENDPOINTS ====================

// Get sales trend (last 30 days)
app.get('/api/analytics/sales-trend', async (req, res) => {
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

// Get top products
app.get('/api/analytics/top-products', async (req, res) => {
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

// Get low stock items
app.get('/api/analytics/low-stock', async (req, res) => {
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

// Get revenue vs profit summary
app.get('/api/analytics/revenue-profit', async (req, res) => {
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
    res.status(500).json({ error: 'Failed to get revenue-profit data' });
  }
});

// ==================== BACKUP ENDPOINTS ====================

// Backup all data to JSON
app.get('/api/backup/json', async (req, res) => {
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

// Export products to CSV
app.get('/api/export/products', async (req, res) => {
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

// Export invoices to CSV
app.get('/api/export/invoices', async (req, res) => {
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

// NOTE: No static file serving - this is an API-only server
// Frontend is deployed separately on Vercel

const port = process.env.PORT || 4000;

// Initialize your original admin user
async function initializeAdminUser() {
  try {
    const db = getDB();
    const usersCollection = db.collection('users');
    
    // Get admin credentials from environment variables
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      logger.warn('ADMIN_PASSWORD is not set — skipping creation of a default admin account. Ensure an admin user exists in the DB.');
      return;
    }
    
    // Check if your original admin account exists
    const existingAdmin = await usersCollection.findOne({ username: adminUsername });
    
    if (!existingAdmin) {
      // Create your original admin account
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      await usersCollection.insertOne({
        username: adminUsername,
        password: hashedPassword,
        email: 'admin@example.com',
        role: 'admin',
        approved: true,
        createdAt: new Date(),
        sessionVersion: 1,
        isDefault: true
      });
      
      logger.info(`✅ Created admin user: ${adminUsername}`);
    } else {
      logger.info(`ℹ️  Admin user already exists: ${adminUsername}`);
    }
    
  } catch (error) {
    logger.error('Error initializing admin user:', error);
  }
}

// ==================== DATABASE MANAGEMENT ENDPOINTS ====================

// ADMIN ONLY - Clear all database collections with photo cleanup
app.delete('/api/admin/clear-all-data', async (req, res) => {
  try {
    const db = getDB();
    
    logger.info('🗑️  Starting database clear operation...');
    
    const results = {
      products: 0,
      customers: 0,
      bills: 0,
      invoices: 0,
      expenses: 0,
      audit_logs: 0,
      users: 0,
      product_images: 0,
      user_images: 0,
      photos: 0
    };
    
    // Clear all collections with counts
    const productsResult = await db.collection('products').deleteMany({});
    results.products = productsResult.deletedCount;
    
    const customersResult = await db.collection('customers').deleteMany({});
    results.customers = customersResult.deletedCount;
    
    const billsResult = await db.collection('bills').deleteMany({});
    results.bills = billsResult.deletedCount;
    
    const invoicesResult = await db.collection('invoices').deleteMany({});
    results.invoices = invoicesResult.deletedCount;
    
    const expensesResult = await db.collection('expenses').deleteMany({});
    results.expenses = expensesResult.deletedCount;
    
    const auditResult = await db.collection('audit_logs').deleteMany({});
    results.audit_logs = auditResult.deletedCount;
    
    // Clear image collections
    const productImagesResult = await db.collection('product_images').deleteMany({});
    results.product_images = productImagesResult.deletedCount;
    
    const userImagesResult = await db.collection('user_images').deleteMany({});
    results.user_images = userImagesResult.deletedCount;
    
    // Keep users collection but delete all except admin
    const usersResult = await db.collection('users').deleteMany({ role: { $ne: 'admin' } });
    results.users = usersResult.deletedCount;
    
    // Clear uploaded photo files from filesystem
    try {
      const uploadsDir = path.join(__dirname, 'uploads');
      if (fsSync.existsSync(uploadsDir)) {
        const subdirs = ['products', 'users', 'profiles'];
        
        for (const subdir of subdirs) {
          const dirPath = path.join(uploadsDir, subdir);
          if (fsSync.existsSync(dirPath)) {
            const files = fsSync.readdirSync(dirPath);
            for (const file of files) {
              try {
                fsSync.unlinkSync(path.join(dirPath, file));
                results.photos++;
              } catch (err) {
                logger.warn(`Failed to delete photo ${file}:`, err.message);
              }
            }
          }
        }
      }
    } catch (photoError) {
      logger.warn('Photo cleanup error:', photoError.message);
    }
    
    const total = Object.values(results).reduce((sum, count) => sum + count, 0);
    
    logger.info('✅ Database cleared successfully');
    logger.info(`📊 Total items deleted: ${total}`);
    logger.info(`   Products: ${results.products}`);
    logger.info(`   Customers: ${results.customers}`);
    logger.info(`   Bills: ${results.bills}`);
    logger.info(`   Invoices: ${results.invoices}`);
    logger.info(`   Expenses: ${results.expenses}`);
    logger.info(`   Audit Logs: ${results.audit_logs}`);
    logger.info(`   Users (non-admin): ${results.users}`);
    logger.info(`   Product Images: ${results.product_images}`);
    logger.info(`   User Images: ${results.user_images}`);
    logger.info(`   Photo Files: ${results.photos}`);
    
    res.json({ 
      success: true, 
      message: 'All data cleared successfully',
      results: results,
      total: total,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error clearing database:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to clear database', 
      details: error.message 
    });
  }
});

// ADMIN ONLY - Reset database and reinitialize with defaults
app.post('/api/admin/reset-database', async (req, res) => {
  try {
    const db = getDB();
    
    logger.info('🔄 Starting database reset...');
    
    // First clear all data
    await db.collection('products').deleteMany({});
    await db.collection('customers').deleteMany({});
    await db.collection('bills').deleteMany({});
    await db.collection('invoices').deleteMany({});
    await db.collection('expenses').deleteMany({});
    await db.collection('audit_logs').deleteMany({});
    await db.collection('product_images').deleteMany({});
    await db.collection('user_images').deleteMany({});
    await db.collection('users').deleteMany({ role: { $ne: 'admin' } });
    
    // Reinitialize indexes
    try {
      await db.collection('products').createIndex({ name: 1 });
      await db.collection('products').createIndex({ sku: 1 }, { unique: true, sparse: true });
      await db.collection('customers').createIndex({ name: 1 });
      await db.collection('customers').createIndex({ phone: 1 }, { sparse: true });
      await db.collection('invoices').createIndex({ created_at: -1 });
      await db.collection('users').createIndex({ username: 1 }, { unique: true });
      logger.info('✅ Database indexes recreated');
    } catch (indexError) {
      logger.warn('Index creation warning:', indexError.message);
    }
    
    logger.info('✅ Database reset completed successfully');
    
    res.json({ 
      success: true, 
      message: 'Database reset and reinitialized successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error resetting database:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to reset database', 
      details: error.message 
    });
  }
});

// ADMIN ONLY - Get database statistics
app.get('/api/admin/database-stats', async (req, res) => {
  try {
    const db = getDB();
    
    const stats = {
      products: await db.collection('products').countDocuments(),
      customers: await db.collection('customers').countDocuments(),
      bills: await db.collection('bills').countDocuments(),
      invoices: await db.collection('invoices').countDocuments(),
      expenses: await db.collection('expenses').countDocuments(),
      audit_logs: await db.collection('audit_logs').countDocuments(),
      users: {
        total: await db.collection('users').countDocuments(),
        admins: await db.collection('users').countDocuments({ role: 'admin' }),
        managers: await db.collection('users').countDocuments({ role: 'manager' }),
        cashiers: await db.collection('users').countDocuments({ role: 'cashier' })
      },
      product_images: await db.collection('product_images').countDocuments(),
      user_images: await db.collection('user_images').countDocuments()
    };
    
    // Get database size info
    const dbStats = await db.stats();
    stats.database = {
      size: dbStats.dataSize,
      storageSize: dbStats.storageSize,
      collections: dbStats.collections,
      indexes: dbStats.indexes
    };
    
    res.json({ success: true, stats });
  } catch (error) {
    logger.error('Error fetching database stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch database statistics', 
      details: error.message 
    });
  }
});

// Connect to MongoDB and start server
connectDB()
  .then(async () => {
    // Initialize your original admin user
    await initializeAdminUser();
    
    app.listen(port, () => {
      logger.info(`🚀 Inventory API listening on port ${port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch(err => {
    logger.error('Failed to connect to database:', err);
    process.exit(1);
  });
