#!/usr/bin/env node
/*
  change-admin-password.js

  Safe, server-side helper to change the stored admin password.
  - Uses existing db.connectDB utility
  - Hashes password with bcrypt
  - Updates admin user and increments sessionVersion
  - Optionally invalidates all sessions (logoutAll)

  Usage examples:
    node scripts/change-admin-password.js --password "n3wP@ssw0rd" --username admin --logoutAll
    ADMIN_USERNAME=admin NEW_ADMIN_PASSWORD=n3wP@ss node scripts/change-admin-password.js --logoutAll

  SECURITY: Run this on the server (or an admin machine) where MONGODB_URI and DB_NAME are available.
*/

require('dotenv').config();
const path = require('path');
const { connectDB, closeDB } = require('../db');
const bcrypt = require('bcrypt');
const readline = require('readline');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--logoutAll') { out.logoutAll = true; continue; }
    if (a.startsWith('--username=')) { out.username = a.split('=')[1]; continue; }
    if (a === '--username') { out.username = args[++i]; continue; }
    if (a.startsWith('--password=')) { out.password = a.split('=')[1]; continue; }
    if (a === '--password') { out.password = args[++i]; continue; }
    if (a === '--help' || a === '-h') { out.help = true; }
  }
  return out;
}

async function promptHidden(promptText) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const stdin = process.stdin;

    // Hide input by muting output
    const onDataHandler = (char) => {
      char = char + '';
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.pause();
          break;
        default:
          process.stdout.clearLine();
          process.stdout.cursorTo(0);
          process.stdout.write(promptText + Array(rl.line ? rl.line.length + 1 : 1).join('*'));
          break;
      }
    };

    process.stdout.write(promptText);
    stdin.on('data', onDataHandler);

    rl.question('', (value) => {
      stdin.removeListener('data', onDataHandler);
      rl.close();
      process.stdout.write('\n');
      resolve(value);
    });
  });
}

async function main() {
  const argv = parseArgs();
  if (argv.help) {
    console.log('Change admin password script');
    console.log('Options: --username <username>  --password <password>  --logoutAll (boolean)');
    process.exit(0);
  }

  const username = (argv.username || process.env.ADMIN_USERNAME || 'admin').toLowerCase();
  let newPassword = argv.password || process.env.NEW_ADMIN_PASSWORD || null;

  if (!newPassword) {
    console.log('No password provided via CLI or NEW_ADMIN_PASSWORD. Prompting securely...');
    newPassword = await promptHidden('New admin password: ');
    if (!newPassword) {
      console.error('No password entered — aborting.');
      process.exit(2);
    }
  }

  // Basic safety checks
  if (newPassword.length < 6) {
    console.warn('Warning: password length < 6 — consider using a stronger password.');
  }

  const logoutAll = !!argv.logoutAll;

  let db;
  try {
    db = await connectDB();

    const users = db.collection('users');
    const admin = await users.findOne({ username });
    if (!admin) {
      console.error(`Admin user not found: ${username}`);
      await closeDB();
      process.exit(3);
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    // Update admin's password and bump sessionVersion so that current sessions are invalidated
    const res = await users.updateOne({ _id: admin._id }, { $set: { password: hashed }, $inc: { sessionVersion: 1 } });
    console.log(`Updated admin password for ${username}. Modified count: ${res.modifiedCount}`);

    if (logoutAll) {
      // Increment sessionVersion for all users to force logout everywhere
      const allRes = await users.updateMany({}, { $inc: { sessionVersion: 1 } });
      console.log(`Invalidated sessions for all users (${allRes.modifiedCount} documents updated)`);

      // Insert an audit log entry (best-effort)
      try {
        await db.collection('audit_logs').insertOne({
          action: 'ADMIN_PASSWORD_CHANGED_INVALIDATE_ALL',
          username,
          timestamp: new Date(),
          details: { message: 'Admin updated password using script and forced logout for all users' }
        });
      } catch (e) {
        console.warn('Failed to write audit log (non-fatal):', e.message);
      }
    } else {
      try {
        await db.collection('audit_logs').insertOne({
          action: 'ADMIN_PASSWORD_CHANGED',
          username,
          timestamp: new Date(),
          details: { message: 'Admin updated password using script' }
        });
      } catch (e) {
        console.warn('Failed to write audit log (non-fatal):', e.message);
      }
    }

    console.log('✅ Admin password change completed successfully.');
  } catch (err) {
    console.error('Error while changing admin password:', err && err.message ? err.message : err);
    process.exitCode = 1;
  } finally {
    try { await closeDB(); } catch (e) {}
  }
}

// Execute if invoked directly
if (require.main === module) {
  main();
}
