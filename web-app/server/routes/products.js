/**
 * Products Routes Module
 * Handles all product-related API endpoints
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { ObjectId } = require('mongodb');
const { getDB } = require('../db');
const logger = require('../logger');
const { validateProduct } = require('../validators');
const upload = require('../middleware/upload');
const { logAudit } = require('../services/auditService');
const { generateProductBarcode, generateBarcodeImage, generateQRCode } = require('../services/barcodeService');
const { savePhotoToDatabase, getPhotoFromDatabase, deletePhotoFromDatabase, deletePhotoFile, ensureUploadDir } = require('../services/photoService');
const { sanitizeObject } = require('../services/helpers');

/**
 * GET /api/products
 * Get products with optional pagination. Supports ?page=N&limit=N&search=term
 * Returns flat array (backward-compatible) + X-Total-Count header
 */
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 500), 1000);
    const skip = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';

    const filter = search
      ? { $or: [
          { name: { $regex: search, $options: 'i' } },
          { barcode: { $regex: search, $options: 'i' } },
          { hsnCode: { $regex: search, $options: 'i' } }
        ] }
      : {};

    const [products, total] = await Promise.all([
      db.collection('products').find(filter).sort({ name: 1 }).skip(skip).limit(limit).toArray(),
      db.collection('products').countDocuments(filter)
    ]);
    
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
      photos: p.photos || [],
      profit: p.price - (p.costPrice || 0),
      profitPercent: p.price > 0 ? (((p.price - (p.costPrice || 0)) / p.price) * 100).toFixed(2) : 0
    }));
    
    res.setHeader('X-Total-Count', total);
    res.json(formatted);
  } catch (e) {
    logger.error('Get products error:', e);
    res.status(500).json({ error: 'Failed to retrieve products' });
  }
});

/**
 * POST /api/products
 * Add a new product with automatic barcode generation
 */
router.post('/', async (req, res) => {
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
      photo: null,   // Legacy single photo (deprecated)
      photos: [],    // Multiple photos array - NEW
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

/**
 * PATCH /api/products/:id
 * Update product stock quantity
 */
router.patch('/:id', async (req, res) => {
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

/**
 * PUT /api/products/:id
 * Full product update (name, price, etc.) - PRESERVES PHOTOS
 * CRITICAL: This endpoint NEVER touches the photos array
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, quantity, price, costPrice, hsnCode, minStock, serialNo, barcode, userId, username } = req.body;
    const db = getDB();
    
    // Validate product data
    const validationErrors = validateProduct({ name, quantity, price, costPrice, hsnCode, minStock });
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors.join(', ') });
    }
    
    // Get product before update for audit
    const oldProduct = await db.collection('products').findOne({ _id: new ObjectId(id) });
    
    if (!oldProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Update product - EXPLICITLY PRESERVE PHOTOS AND PHOTO-RELATED FIELDS
    const updateData = {
      name: sanitizeObject(name),
      quantity: parseInt(quantity) || 0,
      price: parseFloat(price) || 0,
      costPrice: parseFloat(costPrice) || 0,
      hsnCode: hsnCode || '9999',
      minStock: parseInt(minStock) || 10,
      lastModifiedBy: userId || null,
      lastModifiedByUsername: username || 'Unknown',
      lastModified: new Date()
    };
    
    // Only update serialNo and barcode if provided (optional fields)
    if (serialNo !== undefined) updateData.serialNo = serialNo;
    if (barcode !== undefined) updateData.barcode = barcode;
    
    // CRITICAL: Never touch photos, photo, photoStorage, photoDbId, photoFilename
    // These fields are managed ONLY by photo upload/delete endpoints
    
    await db.collection('products').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    // Log audit trail
    await logAudit(db, 'PRODUCT_UPDATED', userId, username, {
      productId: id,
      productName: name,
      changes: {
        name: oldProduct.name !== name ? { old: oldProduct.name, new: name } : undefined,
        price: oldProduct.price !== price ? { old: oldProduct.price, new: price } : undefined,
        quantity: oldProduct.quantity !== quantity ? { old: oldProduct.quantity, new: quantity } : undefined,
        costPrice: oldProduct.costPrice !== costPrice ? { old: oldProduct.costPrice, new: costPrice } : undefined
      }
    });
    
    res.json({ success: true });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * DELETE /api/products/:id
 * Delete a product and ALL its associated photos
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, username } = req.query;
    const db = getDB();
    
    // Get product before deleting
    const product = await db.collection('products').findOne({ _id: new ObjectId(id) });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Delete all photos from photos array
    if (product.photos && Array.isArray(product.photos)) {
      for (const photo of product.photos) {
        try {
          if (photo.storage === 'db' && photo.dbId) {
            await deletePhotoFromDatabase(db, 'product_images', photo.dbId);
          } else if (photo.storage === 'fs' && photo.filename) {
            await deletePhotoFile(path.join(__dirname, '..', 'uploads', 'products', photo.filename));
          }
        } catch (err) {
          logger.warn(`Failed to delete photo ${photo.id}:`, err.message);
        }
      }
    }
    
    // Delete legacy single photo if exists (backward compatibility)
    if (product.photo) {
      try {
        if (product.photoStorage === 'db' || product.photoDbId) {
          const photoId = product.photoDbId || String(product.photo).replace(/^db:/, '');
          if (photoId) await deletePhotoFromDatabase(db, 'product_images', photoId);
        } else {
          const filename = product.photoFilename || (product.photo && path.basename(product.photo));
          if (filename) await deletePhotoFile(path.join(__dirname, '..', 'uploads', 'products', filename));
        }
      } catch (err) {
        logger.warn('Failed to delete legacy product photo:', err.message);
      }
    }
    
    // Delete the product
    await db.collection('products').deleteOne({ _id: new ObjectId(id) });
    
    // Log audit trail
    await logAudit(db, 'PRODUCT_DELETED', userId, username, {
      productId: id,
      productName: product?.name || 'Unknown',
      quantity: product?.quantity || 0,
      price: product?.price || 0,
      photosDeleted: (product.photos || []).length
    });
    
    res.json({ success: true });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/products/barcode/:barcode
 * Search product by barcode (for POS scanning)
 */
router.get('/barcode/:barcode', async (req, res) => {
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

/**
 * GET /api/products/:id/barcode
 * Generate barcode image for a product
 */
router.get('/:id/barcode', async (req, res) => {
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

/**
 * POST /api/products/:id/photo
 * Upload product photo (database or filesystem storage)
 */
router.post('/:id/photo', upload.single('photo'), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, username } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No photo file uploaded' });
    }
    
    const db = getDB();
    const product = await db.collection('products').findOne({ _id: new ObjectId(id) });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // DO NOT delete old photos - we're adding to the array, not replacing
    // This ensures images are NEVER deleted automatically
    
    // Default photo storage: DB unless explicitly requested 'fs'
    const storageMode = String(req.query.storage || '').toLowerCase();
    const useDbStorage = (storageMode !== 'fs');
    
    let photoId = null;
    let photoUrl = null;
    
    if (useDbStorage) {
      // Store in database
      photoId = await savePhotoToDatabase(
        db, 
        'product_images', 
        id, 
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname || req.file.filename
      );

      // Store relative photo URL with the actual photoId for retrieval
      photoUrl = `/api/products/${id}/photo/${photoId}`;

      // ADD to photos array (never replace existing photos)
      await db.collection('products').updateOne(
        { _id: new ObjectId(id) },
        {
          $push: {
            photos: {
              id: photoId,
              url: photoUrl,
              storage: 'db',
              dbId: photoId,
              filename: req.file.originalname || req.file.filename,
              uploadedAt: new Date(),
              uploadedBy: userId || null,
              uploadedByUsername: username || 'Unknown'
            }
          },
          $set: {
            photo: photoUrl, // Keep legacy field updated for backward compatibility
            lastModifiedBy: userId || null,
            lastModifiedByUsername: username || 'Unknown',
            lastModified: new Date()
          }
        }
      );
    } else {
      // Filesystem-backed - save file to disk
      await ensureUploadDir(path.join(__dirname, '..', 'uploads', 'products'));
      const filename = `${id}-${Date.now()}${path.extname(req.file.originalname)}`;
      const filePath = path.join(__dirname, '..', 'uploads', 'products', filename);
      await fs.writeFile(filePath, req.file.buffer);
      photoId = filename;
      photoUrl = `/api/products/${id}/photo/${filename}`;
      
      // ADD to photos array (never replace existing photos)
      await db.collection('products').updateOne(
        { _id: new ObjectId(id) },
        {
          $push: {
            photos: {
              id: filename,
              url: photoUrl,
              storage: 'fs',
              filename: filename,
              uploadedAt: new Date(),
              uploadedBy: userId || null,
              uploadedByUsername: username || 'Unknown'
            }
          },
          $set: {
            photo: photoUrl, // Keep legacy field updated for backward compatibility
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
      photoUrl: photoUrl,
      photoId: photoId,
      storage: useDbStorage ? 'db' : 'fs'
    });
    
    logger.info(`✅ Photo uploaded successfully for product ${id}: ${photoUrl}`);
    
    res.json({ 
      success: true, 
      photo: {
        id: photoId,
        url: photoUrl,
        storage: useDbStorage ? 'db' : 'fs'
      },
      message: 'Product photo uploaded successfully' 
    });
  } catch (e) {
    logger.error('❌ Photo upload error:', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/products/:id/photo
 * Serve product photo (filesystem or DB-backed)
 * Query parameter ?t= is used for cache-busting and is ignored
 */
router.get('/:id/photo', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();
    const product = await db.collection('products').findOne({ _id: new ObjectId(id) });

    if (!product) return res.status(404).json({ error: 'Product not found' });

    // If DB-backed image
    if (product.photoStorage === 'db' || product.photoDbId) {
      const imgId = product.photoDbId || String(product.photo || '').replace(/^db:/, '');
      if (!imgId) return res.status(404).json({ error: 'No DB-stored photo found' });

      const photoData = await getPhotoFromDatabase(db, 'product_images', imgId);
      if (!photoData) return res.status(404).json({ error: 'Image data not found' });

      res.setHeader('Content-Type', photoData.contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours
      return res.send(photoData.data);
    }

    // Filesystem-backed image
    const filename = product.photoFilename || (product.photo && path.basename(product.photo));
    if (!filename) return res.status(404).json({ error: 'No photo available for this product' });

    const imgPath = path.join(__dirname, '..', 'uploads', 'products', filename);
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

/**
 * GET /api/products/:id/photo/:photoId
 * Serve a specific product photo by ID from photos array
 */
router.get('/:id/photo/:photoId', async (req, res) => {
  try {
    const { id, photoId } = req.params;
    const db = getDB();
    const product = await db.collection('products').findOne({ _id: new ObjectId(id) });

    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Find the specific photo in the photos array
    const photo = (product.photos || []).find(p => p.id === photoId || p.dbId === photoId);
    
    if (!photo) {
      // Fallback to legacy single photo for backward compatibility
      return res.status(404).json({ error: 'Photo not found' });
    }

    // If DB-backed image
    if (photo.storage === 'db' && photo.dbId) {
      const photoData = await getPhotoFromDatabase(db, 'product_images', photo.dbId);
      if (!photoData) return res.status(404).json({ error: 'Image data not found' });

      res.setHeader('Content-Type', photoData.contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours
      return res.send(photoData.data);
    }

    // Filesystem-backed image
    if (photo.storage === 'fs' && photo.filename) {
      const imgPath = path.join(__dirname, '..', 'uploads', 'products', photo.filename);
      return res.sendFile(imgPath, err => {
        if (err) {
          logger.warn('Failed to send image file:', err.message);
          res.status(404).json({ error: 'Image not found' });
        }
      });
    }

    res.status(404).json({ error: 'Photo not found' });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * DELETE /api/products/:id/photo
 * Delete product photo (legacy endpoint - deletes all photos)
 */
router.delete('/:id/photo', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, username } = req.query;
    const db = getDB();
    
    const product = await db.collection('products').findOne({ _id: new ObjectId(id) });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    if (product.photo) {
      // If photo references DB-stored image, remove from product_images collection
      if (String(product.photo).startsWith('db:') || product.photoDbId) {
        const photoId = product.photoDbId || String(product.photo).replace(/^db:/, '');
        try {
          await deletePhotoFromDatabase(db, 'product_images', photoId);
        } catch (err) {
          logger.warn('Failed to delete DB-stored product photo:', err.message);
        }
      } else {
        // filesystem-backed image
        try {
          await deletePhotoFile(path.join(__dirname, '..', 'uploads', 'products', path.basename(product.photo)));
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

/**
 * DELETE /api/products/:id/photo/:photoId
 * Delete a specific photo from product's photos array
 * REQUIRES: confirmed=true query parameter to prevent accidental deletion
 */
router.delete('/:id/photo/:photoId', async (req, res) => {
  try {
    const { id, photoId } = req.params;
    const { userId, username, confirmed } = req.query;
    
    // STRICT DELETION RULE: Require explicit confirmation
    if (confirmed !== 'true') {
      return res.status(400).json({ 
        error: 'Photo deletion requires explicit confirmation',
        message: 'Please confirm deletion by adding ?confirmed=true to the request'
      });
    }
    
    const db = getDB();
    const product = await db.collection('products').findOne({ _id: new ObjectId(id) });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Find the photo to delete
    const photo = (product.photos || []).find(p => p.id === photoId || p.dbId === photoId);
    
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    // Delete the actual file/data
    try {
      if (photo.storage === 'db' && photo.dbId) {
        await deletePhotoFromDatabase(db, 'product_images', photo.dbId);
      } else if (photo.storage === 'fs' && photo.filename) {
        await deletePhotoFile(path.join(__dirname, '..', 'uploads', 'products', photo.filename));
      }
    } catch (err) {
      logger.warn('Failed to delete photo file/data:', err.message);
      // Continue with removal from array even if file deletion fails
    }
    
    // Remove photo from photos array
    await db.collection('products').updateOne(
      { _id: new ObjectId(id) },
      { 
        $pull: { 
          photos: { id: photoId }
        },
        $set: {
          lastModifiedBy: userId || null,
          lastModifiedByUsername: username || 'Unknown',
          lastModified: new Date()
        }
      }
    );
    
    // Log audit trail
    await logAudit(db, 'PRODUCT_PHOTO_DELETED', userId, username, {
      productId: id,
      productName: product.name,
      photoId: photoId,
      filename: photo.filename || 'unknown'
    });
    
    res.json({ 
      success: true, 
      message: 'Photo deleted successfully',
      photoId: photoId
    });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/products/migrate-photos
 * Admin endpoint to migrate filesystem photos to database
 */
router.post('/migrate-photos', async (req, res) => {
  try {
    const { adminUsername, adminPassword, deleteFiles } = req.body;
    if (!adminUsername || !adminPassword) {
      return res.status(400).json({ error: 'Admin credentials required' });
    }
    
    const db = getDB();
    const bcrypt = require('bcrypt');
    const admin = await db.collection('users').findOne({ 
      username: adminUsername.toLowerCase(), 
      role: 'admin' 
    });
    
    if (!admin) return res.status(403).json({ error: 'Admin user not found' });
    
    const match = await bcrypt.compare(adminPassword, admin.password);
    if (!match) return res.status(401).json({ error: 'Invalid admin password' });

    const base = process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 4000}`;
    let productsUpdated = 0;
    
    const products = await db.collection('products').find({ 
      $or: [ 
        { photoStorage: { $ne: 'db' } }, 
        { photoFilename: { $exists: true } } 
      ] 
    }).toArray();
    
    for (const p of products) {
      try {
        const filename = p.photoFilename || (p.photo && path.basename(p.photo));
        if (!filename) continue;
        
        const photoPath = path.join(__dirname, '..', 'uploads', 'products', filename);
        if (!fsSync.existsSync(photoPath)) continue;
        
        const buffer = await fs.readFile(photoPath);
        const photoId = await savePhotoToDatabase(
          db, 
          'product_images', 
          p._id.toString(), 
          buffer,
          'image/jpeg',
          filename
        );
        
        await db.collection('products').updateOne(
          { _id: p._id }, 
          { 
            $set: { 
              photo: `${base}/api/products/${p._id.toString()}/photo`, 
              photoStorage: 'db', 
              photoDbId: photoId 
            } 
          }
        );
        
        if (deleteFiles) {
          try { 
            await deletePhotoFile(photoPath); 
          } catch (e) { 
            /* ignore */ 
          }
        }
        
        productsUpdated++;
      } catch (e) { 
        logger.warn('Failed to migrate product photo:', e.message); 
        continue; 
      }
    }

    await logAudit(db, 'ADMIN_MIGRATE_PHOTOS_TO_DB', admin._id.toString(), admin.username, { 
      productsUpdated, 
      deleteFiles: !!deleteFiles 
    });
    
    res.json({ 
      success: true, 
      message: `Migrated ${productsUpdated} product photos to DB` 
    });
  } catch (e) {
    logger.error('Migrate photos to DB failed', e);
    res.status(500).json({ error: 'Failed to migrate photos to DB', details: e.message });
  }
});

module.exports = router;
