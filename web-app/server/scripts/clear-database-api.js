#!/usr/bin/env node

/**
 * Clear Database via API
 * Uses the admin API endpoint to clear the database
 */

const https = require('https');
const http = require('http');
require('dotenv').config();

const API_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:4000';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

console.log('\n🚨 Clearing database via API...');
console.log(`API: ${API_URL}`);
console.log(`Admin: ${ADMIN_USERNAME}\n`);

const postData = JSON.stringify({
  adminUsername: ADMIN_USERNAME,
  adminPassword: ADMIN_PASSWORD
});

const url = new URL(`${API_URL}/api/admin/clear-database`);
const isHttps = url.protocol === 'https:';
const lib = isHttps ? https : http;

const options = {
  hostname: url.hostname,
  port: url.port || (isHttps ? 443 : 80),
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = lib.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (res.statusCode === 200) {
        console.log('✅ Database cleared successfully!');
        console.log('\n📊 Results:');
        console.log(JSON.stringify(response, null, 2));
      } else {
        console.error('❌ Error:', response.error || response.message);
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
  console.log('\n💡 Make sure your server is running:');
  console.log('   cd web-app/server');
  console.log('   npm start');
  process.exit(1);
});

req.write(postData);
req.end();
