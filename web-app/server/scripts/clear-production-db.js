#!/usr/bin/env node

/**
 * Clear Production Database
 * Clears the database on your deployed server
 */

const https = require('https');

// Your Render.com backend URL
const API_URL = 'https://inventory-api-zcb0.onrender.com';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

console.log('\n🚨 CLEARING PRODUCTION DATABASE...');
console.log(`API: ${API_URL}`);
console.log(`Admin: ${ADMIN_USERNAME}\n`);

const postData = JSON.stringify({
  adminUsername: ADMIN_USERNAME,
  adminPassword: ADMIN_PASSWORD
});

const url = new URL(`${API_URL}/api/admin/clear-database`);

const options = {
  hostname: url.hostname,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (res.statusCode === 200) {
        console.log('✅ Production database cleared successfully!');
        console.log('\n📊 Results:');
        console.log(JSON.stringify(response, null, 2));
        console.log('\n🔄 Your production database is now empty.');
      } else {
        console.error('❌ Error:', response.error || response.message);
        console.error('Status:', res.statusCode);
        process.exit(1);
      }
    } catch (e) {
      console.error('❌ Failed to parse response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  process.exit(1);
});

req.write(postData);
req.end();
