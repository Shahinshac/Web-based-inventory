// Quick MongoDB Connection Test
// Run this to verify your connection string works

const { MongoClient } = require('mongodb');

// ⚠️ REPLACE THIS WITH YOUR ACTUAL MONGODB_URI
const uri = 'mongodb+srv://username:password@cluster.mongodb.net/inventorydb?retryWrites=true&w=majority';

async function testConnection() {
  console.log('🔗 Testing MongoDB connection...');
  console.log('URI:', uri.replace(/:[^:]*@/, ':****@')); // Hide password
  
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
  });

  try {
    await client.connect();
    console.log('✅ SUCCESS! MongoDB connection works!');
    
    const db = client.db('inventorydb');
    const collections = await db.listCollections().toArray();
    console.log('📦 Collections:', collections.map(c => c.name).join(', ') || 'None yet');
    
  } catch (error) {
    console.error('❌ FAILED! Error:', error.message);
    console.error('\n💡 Common fixes:');
    console.error('   1. Check username/password are correct');
    console.error('   2. URL-encode special characters in password');
    console.error('   3. Whitelist 0.0.0.0/0 in MongoDB Atlas Network Access');
    console.error('   4. Make sure cluster is not paused');
  } finally {
    await client.close();
  }
}

testConnection();
