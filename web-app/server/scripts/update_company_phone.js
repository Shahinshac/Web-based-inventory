#!/usr/bin/env node

/*
  Simple CLI script to update companyPhone on all bills
  Usage:
    node scripts/update_company_phone.js mongodb_uri dbName "7594012761"
  Or, set MONGODB_URI and DB_NAME env vars and run:
    node scripts/update_company_phone.js "7594012761"
*/

const { MongoClient } = require('mongodb');

async function run() {
  try {
    let uri = process.argv[2] || process.env.MONGODB_URI;
    let dbName = process.argv[3] || process.env.DB_NAME || 'inventorydb';
    let newPhone = process.argv[4] || process.argv[3] || process.argv[2] || process.env.COMPANY_PHONE || '7594012761';

    // If invoked as `npm run update-company-phone -- 7594012761`, argv[2] will be the phone and not URI
    if (uri && !uri.startsWith('mongodb')) {
      // treat uri as missing; shift args so newPhone is first provided arg
      newPhone = process.argv[2] || process.env.COMPANY_PHONE || '7594012761';
      uri = process.env.MONGODB_URI;
      dbName = process.env.DB_NAME || 'inventorydb';
    }

    if (!uri) return console.error('MongoDB URI required. Pass as first argument or set MONGODB_URI');
    if (!newPhone) return console.error('New company phone required as argument or set COMPANY_PHONE');

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);

    const result = await db.collection('bills').updateMany({}, { $set: { companyPhone: String(newPhone) } });
    console.log(`Updated ${result.modifiedCount} invoices to companyPhone=${newPhone}`);
    await client.close();
  } catch (e) {
    console.error('Error', e.message || e);
    process.exit(1);
  }
}

run();
