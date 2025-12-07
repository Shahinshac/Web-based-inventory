#!/usr/bin/env node
/*
 * CLI: Migrate product and user photos from filesystem into DB-backed collections
 * Usage: node migrate_photos_to_db.js --delete-files
 * Reads from ./uploads/products and ./uploads/users and stores image bytes into product_images and user_images.
 */
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
const { connectDB, closeDB } = require('../db');
const { ObjectId } = require('mongodb');

(async function() {
  const argv = yargs(hideBin(process.argv))
    .option('delete-files', { type: 'boolean', default: false, description: 'Delete original filesystem images after migrating to DB' })
    .option('dry-run', { type: 'boolean', default: false, description: 'Perform a dry run without persisting changes' })
    .help()
    .argv;

  const deleteFiles = argv['delete-files'];
  const dryRun = argv['dry-run'];
  console.log('Starting photo migration: deleteFiles=', deleteFiles, 'dryRun=', dryRun);

  const db = await connectDB();

  try {
    // Products
    const products = await db.collection('products').find({ $or: [ { photoStorage: { $ne: 'db' } }, { photoFilename: { $exists: true } } ] }).toArray();
    let migratedProducts = 0;
    for (const p of products) {
      const filename = p.photoFilename || (p.photo && path.basename(p.photo));
      if (!filename) continue;
      const photoPath = path.join(__dirname, '..', 'uploads', 'products', filename);
      if (!fsSync.existsSync(photoPath)) continue;
      const buf = await fs.readFile(photoPath);
      if (dryRun) { console.log('[DRY] Would insert product image:', p._id.toString(), filename); migratedProducts++; continue; }
      const imgDoc = { productId: p._id, filename, contentType: 'image/jpeg', data: buf, uploadedAt: new Date() };
      const imgRes = await db.collection('product_images').insertOne(imgDoc);
      await db.collection('products').updateOne({ _id: p._id }, { $set: { photo: `${process.env.PUBLIC_BASE_URL || 'http://localhost:4000'}/api/products/${p._id.toString()}/photo`, photoStorage: 'db', photoDbId: imgRes.insertedId.toString() } });
      if (deleteFiles) { try { await fs.unlink(photoPath); } catch (err) { console.warn('Failed to delete file', photoPath, err.message); } }
      migratedProducts++;
      console.log('Migrated product', p._id.toString(), '->', imgRes.insertedId.toString());
    }

    // Users
    const users = await db.collection('users').find({ $or: [ { photoStorage: { $ne: 'db' } }, { photoFilename: { $exists: true } } ] }).toArray();
    let migratedUsers = 0;
    for (const u of users) {
      const filename = u.photoFilename || (u.photo && path.basename(u.photo));
      if (!filename) continue;
      const photoPath = path.join(__dirname, '..', 'uploads', 'users', filename);
      if (!fsSync.existsSync(photoPath)) continue;
      const buf = await fs.readFile(photoPath);
      if (dryRun) { console.log('[DRY] Would insert user image:', u._id.toString(), filename); migratedUsers++; continue; }
      const imgDoc = { userId: u._id, filename, contentType: 'image/jpeg', data: buf, uploadedAt: new Date() };
      const imgRes = await db.collection('user_images').insertOne(imgDoc);
      await db.collection('users').updateOne({ _id: u._id }, { $set: { photo: `${process.env.PUBLIC_BASE_URL || 'http://localhost:4000'}/api/users/${u._id.toString()}/photo`, photoStorage: 'db', photoDbId: imgRes.insertedId.toString() } });
      if (deleteFiles) { try { await fs.unlink(photoPath); } catch (err) { console.warn('Failed to delete file', photoPath, err.message); } }
      migratedUsers++;
      console.log('Migrated user', u._id.toString(), '->', imgRes.insertedId.toString());
    }

    console.log('Migration completed:', migratedProducts, 'products and', migratedUsers, 'users migrated');
  } catch (e) {
    console.error('Migration failed', e.message);
    process.exit(1);
  } finally {
    await closeDB();
    process.exit(0);
  }
})();
