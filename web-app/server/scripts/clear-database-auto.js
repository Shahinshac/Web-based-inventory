#!/usr/bin/env node

/**
 * Automatic Database Clear Script
 * Clears all data from the inventory database WITHOUT confirmation
 * USE WITH CAUTION - This will delete all data immediately!
 * 
 * Usage:
 *   node scripts/clear-database-auto.js
 */

require('dotenv').config();
const { clearDatabase } = require('./clear-database');

console.log('\n🚨 AUTOMATIC DATABASE CLEAR - Starting in 2 seconds...\n');

setTimeout(async () => {
  try {
    await clearDatabase();
    console.log('✅ Database cleared successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
    process.exit(1);
  }
}, 2000);
