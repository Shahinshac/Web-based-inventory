#!/usr/bin/env node
(async function(){
  try{
    const { connectDB, closeDB } = require('../db');
    const db = await connectDB();
    const rows = await db.collection('audit_logs').find({ action: { $regex: 'ADMIN_PASSWORD_CHANGED', $options: 'i' } }).sort({ timestamp: -1 }).limit(10).toArray();
    console.log('=== audit_logs matching ADMIN_PASSWORD_CHANGED (most recent 10) ===');
    console.log(JSON.stringify(rows, null, 2));
    await closeDB();
  } catch(e){
    console.error('ERROR', e && e.message ? e.message : e);
    process.exitCode = 1;
  }
})();
