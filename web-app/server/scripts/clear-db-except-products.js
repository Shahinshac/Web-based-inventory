#!/usr/bin/env node
/*
  clear-db-except-products.js

  Safe administrative helper to delete all documents from all collections
  except the `products` collection. The script supports a dry-run mode
  (default) and requires an explicit --confirm flag (or env var CLEAR_DB_CONFIRM)
  to perform destructive operations.

  Usage examples:
    # Dry run (default) - shows which collections would be cleared
    node scripts/clear-db-except-products.js

    # Actual delete (requires confirmation flag)
    CLEAR_DB_CONFIRM=true node scripts/clear-db-except-products.js --confirm

    # Safer: interactive confirmation
    node scripts/clear-db-except-products.js --interactive

  SECURITY: Run on the server/host that has MONGODB_URI and DB_NAME available.
  ALWAYS create a database backup before running destructive operations.
*/

require('dotenv').config();
const { connectDB, closeDB } = require('../db');
const readline = require('readline');

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    confirm: args.includes('--confirm'),
    interactive: args.includes('--interactive'),
    dryRun: args.includes('--dry-run') || (!args.includes('--confirm') && !args.includes('--interactive'))
  };
}

async function askConfirm(promptText) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(promptText, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'yes' || answer.trim().toLowerCase() === 'y');
    });
  });
}

async function main() {
  const argv = parseArgs();
  const explicitEnv = (process.env.CLEAR_DB_CONFIRM || '').toLowerCase() === 'true';

  const willRunDestructive = argv.confirm || explicitEnv || argv.interactive;

  console.log('=== clear-db-except-products.js ===');
  console.log('DRY RUN by default. Use --confirm or set CLEAR_DB_CONFIRM=true to execute.');

  if (!willRunDestructive && !argv.dryRun) {
    console.log('No action chosen. Running dry-run (no changes will be made).');
  }

  let db;
  try {
    db = await connectDB();

    const collections = await db.listCollections({}, { nameOnly: true }).toArray();

    const toProcess = collections
      .map(c => c.name)
      .filter(name => name && !name.startsWith('system.') && name !== 'products');

    if (toProcess.length === 0) {
      console.log('No collections found to clear (aside from products). Exiting.');
      return;
    }

    console.log('Found collections (excluding products) to clear:');
    console.log(toProcess.map(n => `  - ${n}`).join('\n'));

    if (argv.dryRun && !willRunDestructive) {
      console.log('\nDry run complete — nothing deleted. To execute, re-run with --confirm or set CLEAR_DB_CONFIRM=true.');
      return;
    }

    if (argv.interactive && !explicitEnv) {
      const ok = await askConfirm('\nThis will DELETE ALL DOCUMENTS from the listed collections except `products`. Type YES to proceed: ');
      if (!ok) {
        console.log('Aborting per user input. No changes made.');
        return;
      }
    }

    // Final safety check
    if (!argv.confirm && !explicitEnv && !argv.interactive) {
      console.log('\nRefusing to run destructive operation without explicit --confirm, --interactive, or CLEAR_DB_CONFIRM=true');
      return;
    }

    // Perform deletion (deleteMany for each collection)
    const results = [];
    for (const colName of toProcess) {
      try {
        const res = await db.collection(colName).deleteMany({});
        results.push({ collection: colName, deletedCount: res.deletedCount });
        console.log(`Cleared ${res.deletedCount} documents from collection: ${colName}`);
      } catch (e) {
        console.error(`Failed to clear collection ${colName}:`, e.message || e);
        results.push({ collection: colName, error: e.message || String(e) });
      }
    }

    // Insert audit log
    try {
      await db.collection('audit_logs').insertOne({
        action: 'DB_CLEANUP_EXCEPT_PRODUCTS',
        username: process.env.USER || 'script',
        timestamp: new Date(),
        details: { results }
      });
    } catch (e) {
      console.warn('Failed to write audit log:', e.message || e);
    }

    console.log('\n✅ Database cleanup completed (products preserved).');
  } catch (e) {
    console.error('Error during cleanup:', e && e.message ? e.message : e);
  } finally {
    try { await closeDB(); } catch(e){}
  }
}

if (require.main === module) {
  main();
}
