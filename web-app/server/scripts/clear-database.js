#!/usr/bin/env node

/**
 * Database Reset Script
 * Clears all data from the inventory database
 * Can be run standalone or called from the API
 * 
 * Usage:
 *   node scripts/clear-database.js [options]
 * 
 * Options:
 *   --keep-admin    Keep admin users (default)
 *   --full          Delete everything including admins
 *   --products      Clear only products
 *   --customers     Clear only customers
 *   --invoices      Clear only invoices/bills
 *   --users         Clear only non-admin users
 *   --photos        Clear only uploaded photos
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'inventorydb';

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  keepAdmin: !args.includes('--full'),
  products: args.includes('--products'),
  customers: args.includes('--customers'),
  invoices: args.includes('--invoices'),
  users: args.includes('--users'),
  photos: args.includes('--photos'),
  all: !args.includes('--products') && !args.includes('--customers') && 
       !args.includes('--invoices') && !args.includes('--users') && !args.includes('--photos')
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function clearPhotos() {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  
  if (!fs.existsSync(uploadsDir)) {
    log('📁 No uploads directory found', 'yellow');
    return { deleted: 0 };
  }

  let deletedCount = 0;
  const subdirs = ['products', 'users', 'profiles'];

  for (const subdir of subdirs) {
    const dirPath = path.join(uploadsDir, subdir);
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        try {
          fs.unlinkSync(path.join(dirPath, file));
          deletedCount++;
        } catch (error) {
          log(`⚠️  Failed to delete ${file}: ${error.message}`, 'yellow');
        }
      }
      log(`🗑️  Cleared ${files.length} files from ${subdir}/`, 'cyan');
    }
  }

  return { deleted: deletedCount };
}

async function clearDatabase() {
  let client;
  
  try {
    log('\n🔄 Connecting to MongoDB...', 'cyan');
    client = new MongoClient(uri);
    await client.connect();
    log('✅ Connected successfully\n', 'green');

    const db = client.db(dbName);
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

    // Clear Products
    if (options.all || options.products) {
      log('🗑️  Clearing products...', 'yellow');
      const productsResult = await db.collection('products').deleteMany({});
      results.products = productsResult.deletedCount;
      log(`   ✓ Deleted ${results.products} products`, 'green');

      // Clear product images collection
      const productImagesResult = await db.collection('product_images').deleteMany({});
      results.product_images = productImagesResult.deletedCount;
      log(`   ✓ Deleted ${results.product_images} product image records`, 'green');
    }

    // Clear Customers
    if (options.all || options.customers) {
      log('🗑️  Clearing customers...', 'yellow');
      const customersResult = await db.collection('customers').deleteMany({});
      results.customers = customersResult.deletedCount;
      log(`   ✓ Deleted ${results.customers} customers`, 'green');
    }

    // Clear Invoices/Bills
    if (options.all || options.invoices) {
      log('🗑️  Clearing invoices/bills...', 'yellow');
      const billsResult = await db.collection('bills').deleteMany({});
      results.bills = billsResult.deletedCount;
      
      const invoicesResult = await db.collection('invoices').deleteMany({});
      results.invoices = invoicesResult.deletedCount;
      
      log(`   ✓ Deleted ${results.bills} bills`, 'green');
      log(`   ✓ Deleted ${results.invoices} invoices`, 'green');
    }

    // Clear Expenses
    if (options.all) {
      log('🗑️  Clearing expenses...', 'yellow');
      const expensesResult = await db.collection('expenses').deleteMany({});
      results.expenses = expensesResult.deletedCount;
      log(`   ✓ Deleted ${results.expenses} expenses`, 'green');
    }

    // Clear Audit Logs
    if (options.all) {
      log('🗑️  Clearing audit logs...', 'yellow');
      const auditResult = await db.collection('audit_logs').deleteMany({});
      results.audit_logs = auditResult.deletedCount;
      log(`   ✓ Deleted ${results.audit_logs} audit log entries`, 'green');
    }

    // Clear Users (keeping admin if specified)
    if (options.all || options.users) {
      log('🗑️  Clearing users...', 'yellow');
      
      if (options.keepAdmin) {
        const usersResult = await db.collection('users').deleteMany({ role: { $ne: 'admin' } });
        results.users = usersResult.deletedCount;
        log(`   ✓ Deleted ${results.users} non-admin users (admins preserved)`, 'green');
      } else {
        const usersResult = await db.collection('users').deleteMany({});
        results.users = usersResult.deletedCount;
        log(`   ✓ Deleted ${results.users} users (including admins)`, 'red');
      }

      // Clear user images collection
      const userImagesResult = await db.collection('user_images').deleteMany({});
      results.user_images = userImagesResult.deletedCount;
      log(`   ✓ Deleted ${results.user_images} user image records`, 'green');
    }

    // Clear uploaded photo files
    if (options.all || options.photos) {
      log('🗑️  Clearing uploaded photos...', 'yellow');
      const photoResults = await clearPhotos();
      results.photos = photoResults.deleted;
      log(`   ✓ Deleted ${results.photos} photo files`, 'green');
    }

    // Summary
    log('\n' + '='.repeat(50), 'bright');
    log('DATABASE CLEAR SUMMARY', 'bright');
    log('='.repeat(50), 'bright');
    
    const total = Object.values(results).reduce((sum, count) => sum + count, 0);
    
    log(`\n📊 Total Items Deleted: ${total}`, 'cyan');
    log('\nDetails:', 'bright');
    for (const [key, count] of Object.entries(results)) {
      if (count > 0) {
        log(`   ${key.padEnd(20)}: ${count}`, 'green');
      }
    }
    
    log('\n✅ Database cleared successfully!', 'green');
    log('='.repeat(50) + '\n', 'bright');

    return results;

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    log(error.stack, 'red');
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      log('🔌 Database connection closed\n', 'cyan');
    }
  }
}

// Show help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
${colors.bright}Database Clear Script${colors.reset}

Usage:
  node scripts/clear-database.js [options]

Options:
  --keep-admin    Keep admin users (default behavior)
  --full          Delete everything including admin users
  --products      Clear only products and product images
  --customers     Clear only customers
  --invoices      Clear only invoices/bills
  --users         Clear only non-admin users
  --photos        Clear only uploaded photo files
  --help, -h      Show this help message

Examples:
  node scripts/clear-database.js
    Clears all data but keeps admin users

  node scripts/clear-database.js --full
    Clears absolutely everything including admins

  node scripts/clear-database.js --products
    Clears only products

  node scripts/clear-database.js --products --customers
    Clears products and customers only
  `);
  process.exit(0);
}

// Run the clear operation
if (require.main === module) {
  log('\n🚨 WARNING: This will permanently delete data from the database!', 'red');
  log(`Database: ${dbName}`, 'yellow');
  log(`Options: ${JSON.stringify(options, null, 2)}`, 'yellow');
  
  // Ask for confirmation
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('\nType "YES" to confirm: ', async (answer) => {
    readline.close();
    
    if (answer === 'YES') {
      await clearDatabase();
      process.exit(0);
    } else {
      log('\n❌ Operation cancelled', 'yellow');
      process.exit(0);
    }
  });
}

module.exports = { clearDatabase, clearPhotos };
