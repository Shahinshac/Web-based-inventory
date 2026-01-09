/**
 * Database Connection Module
 * Handles MongoDB connection with retry logic and index creation
 */

const { MongoClient } = require('mongodb');
const logger = require('./logger');

// =============================================================================
// CONFIGURATION
// =============================================================================

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = process.env.DB_NAME || 'inventorydb';
const MAX_CONNECTION_ATTEMPTS = 6;

// Connection state
let mongoClient = null;
let database = null;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Mask sensitive credentials in URI for safe logging
 * @param {string} connectionUri - MongoDB connection URI
 * @returns {string} Masked URI safe for logging
 */
function maskConnectionUri(connectionUri) {
  try {
    const url = new URL(connectionUri);
    if (url.password) url.password = '***';
    if (url.username) url.username = url.username.substring(0, 3) + '***';
    return url.toString();
  } catch {
    return connectionUri.substring(0, 20) + '***';
  }
}

/**
 * Calculate delay for exponential backoff
 * @param {number} attempt - Current attempt number
 * @returns {number} Delay in milliseconds
 */
function calculateBackoffDelay(attempt) {
  const MAX_DELAY = 16000;
  return Math.min(1000 * Math.pow(2, attempt - 1), MAX_DELAY);
}

/**
 * Log connection error with detailed diagnostics
 * @param {Error} error - Connection error
 * @param {number} attempt - Current attempt number
 */
function logConnectionError(error, attempt) {
  logger.error(`\n❌ Connection attempt ${attempt} failed`);
  logger.error('Error name:', error.name);
  logger.error('Error message:', error.message);
  
  if (error.cause) {
    logger.error('Underlying cause:', error.cause.message || error.cause);
  }
  
  // Log topology state if available
  if (mongoClient?.topology?.s?.description) {
    const description = mongoClient.topology.s.description;
    logger.error('Topology state:', {
      type: description.type,
      setName: description.setName,
      serverCount: description.servers?.size || 0
    });
    
    // Show server-specific errors
    if (description.servers?.size > 0) {
      description.servers.forEach((server, host) => {
        if (server.error) {
          logger.error(`Server ${host} error:`, server.error.message);
        }
      });
    }
  }
  
  // Provide helpful suggestions based on error type
  const errorMsg = error.message.toLowerCase();
  const errorCode = error.code;
  
  if (errorMsg.includes('tls') || errorMsg.includes('ssl') || errorMsg.includes('alert number 80')) {
    logger.error('\n⚠️  TLS/SSL HANDSHAKE FAILURE DETECTED');
    logger.error('Possible causes:');
    logger.error('  1. IP not whitelisted in MongoDB Atlas Network Access');
    logger.error('  2. TLS version mismatch (Atlas requires TLS 1.2+)');
    logger.error('  3. Certificate validation failure');
    logger.error('  4. Firewall blocking outbound connections');
    logger.error('\nActions to take:');
    logger.error('  ✓ Add 0.0.0.0/0 to Atlas Network Access (or Render IPs)');
    logger.error('  ✓ Ensure connection string includes &tls=true');
    logger.error('  ✓ Check Atlas cluster is not paused/stopped');
  }
  
  if (errorMsg.includes('replicasetnoprimary') || errorMsg.includes('no primary')) {
    logger.error('\n⚠️  NO PRIMARY REPLICA DETECTED');
    logger.error('Actions: Check MongoDB Atlas cluster status and health');
  }
  
  if (errorMsg.includes('enotfound') || errorMsg.includes('querysrv')) {
    logger.error('\n⚠️  DNS/SRV RESOLUTION FAILURE');
    logger.error('Actions: Check DNS settings, try standard connection string instead of SRV');
  }
  
  if (errorCode === 'ETIMEDOUT' || errorCode === 'ECONNREFUSED') {
    logger.error('\n⚠️  NETWORK CONNECTIVITY ISSUE');
    logger.error('Actions: Check firewall, proxy settings, or Atlas status');
  }
}

/**
 * Log fatal connection failure and exit
 */
function handleFatalConnectionFailure() {
  logger.error('\n💥 ALL CONNECTION ATTEMPTS FAILED');
  logger.error('Deployment cannot proceed without database connection');
  logger.error('Review the error messages above and check:');
  logger.error('  - MONGODB_URI environment variable is correct');
  logger.error('  - MongoDB Atlas Network Access allows this IP');
  logger.error('  - MongoDB Atlas cluster is running');
  logger.error('  - No firewall blocking port 27017 or 27017+');
  process.exit(1);
}

// =============================================================================
// INDEX CREATION
// =============================================================================

/**
 * Create database indexes for optimal query performance
 * @param {Db} db - MongoDB database instance
 */
async function createDatabaseIndexes(db) {
  try {
    logger.info('🔧 Creating database indexes...');
    
    // Products collection indexes
    await db.collection('products').createIndex({ name: 1 });
    await db.collection('products').createIndex({ sku: 1 }, { unique: true, sparse: true });
    await db.collection('products').createIndex({ quantity: 1 });
    await db.collection('products').createIndex({ price: 1 });
    await db.collection('products').createIndex({ hsnCode: 1 });
    
    // Customers collection indexes
    await db.collection('customers').createIndex({ name: 1 });
    await db.collection('customers').createIndex({ phone: 1 }, { sparse: true });
    await db.collection('customers').createIndex({ email: 1 }, { sparse: true });
    
    // Invoices collection indexes
    await db.collection('invoices').createIndex({ created_at: -1 });
    await db.collection('invoices').createIndex({ customer_id: 1 });
    await db.collection('invoices').createIndex({ total: -1 });
    await db.collection('invoices').createIndex({ 'items.productId': 1 });
    
    // Users collection indexes
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ approved: 1 });
    await db.collection('users').createIndex({ role: 1 });
    await db.collection('users').createIndex({ lastLogin: -1 });
    
    logger.info('✅ Database indexes created successfully\n');
  } catch (error) {
    console.warn('⚠️  Index creation warning (non-critical):', error.message);
  }
}

// =============================================================================
// CONNECTION MANAGEMENT
// =============================================================================

/**
 * Build MongoDB connection options
 * @returns {Object} Connection options object
 */
function buildConnectionOptions() {
  const isTlsRequired = MONGODB_URI.includes('mongodb+srv://') || 
                        MONGODB_URI.includes('ssl=true') || 
                        MONGODB_URI.includes('tls=true');
  
  return {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4, // Force IPv4
    tls: isTlsRequired,
    retryWrites: true,
    retryReads: true,
    maxPoolSize: 10,
    minPoolSize: 2
  };
}

/**
 * Connect to MongoDB with retry logic
 * @returns {Promise<Db>} MongoDB database instance
 */
async function connectDB() {
  // Return existing connection if available
  if (database) return database;
  
  // Log connection info
  const connectionFormat = MONGODB_URI.startsWith('mongodb+srv://') ? 'SRV' : 'Standard';
  logger.info('🔐 MongoDB URI format:', connectionFormat);
  logger.info('🔗 Connecting to:', maskConnectionUri(MONGODB_URI));
  logger.info('📦 Database name:', DATABASE_NAME);
  logger.info('🏗️  Node.js version:', process.version);
  logger.info('📚 MongoDB driver version:', require('mongodb/package.json').version);
  
  const connectionOptions = buildConnectionOptions();
  
  // Attempt connection with retry logic
  for (let attempt = 1; attempt <= MAX_CONNECTION_ATTEMPTS; attempt++) {
    const timestamp = new Date().toISOString();
    logger.info(`\n[${timestamp}] 🔄 Connection attempt ${attempt}/${MAX_CONNECTION_ATTEMPTS}...`);
    
    try {
      logger.info('⚙️  Connection options:', JSON.stringify({
        useNewUrlParser: connectionOptions.useNewUrlParser,
        useUnifiedTopology: connectionOptions.useUnifiedTopology,
        tls: connectionOptions.tls,
        family: connectionOptions.family
      }, null, 2));
      
      // Create client and connect
      mongoClient = new MongoClient(MONGODB_URI, connectionOptions);
      await mongoClient.connect();
      
      // Test connection with ping
      const pingResult = await mongoClient.db('admin').command({ ping: 1 });
      logger.info('🏓 Ping result:', pingResult);
      
      // Get database reference
      database = mongoClient.db(DATABASE_NAME);
      
      // Log topology details
      const topology = mongoClient.topology;
      if (topology?.s?.description) {
        const desc = topology.s.description;
        logger.info('🌐 Topology type:', desc.type);
        
        if (desc.servers?.size > 0) {
          const serverInfo = Array.from(desc.servers.entries()).map(([host, server]) => ({
            host,
            type: server.type,
            roundTripTime: server.roundTripTime
          }));
          logger.info('📡 Connected servers:', JSON.stringify(serverInfo, null, 2));
        }
      }
      
      logger.info('✅ Connected to MongoDB successfully');
      logger.info(`📊 Using database: ${DATABASE_NAME}\n`);
      
      // Create indexes
      await createDatabaseIndexes(database);
      
      return database;
      
    } catch (error) {
      logConnectionError(error, attempt);
      
      // Exit on final attempt
      if (attempt >= MAX_CONNECTION_ATTEMPTS) {
        handleFatalConnectionFailure();
      }
      
      // Wait before retry with exponential backoff
      const delay = calculateBackoffDelay(attempt);
      logger.info(`⏳ Retrying in ${delay}ms...\n`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Get the connected database instance
 * @returns {Db} MongoDB database instance
 * @throws {Error} If database not connected
 */
function getDB() {
  if (!database) {
    throw new Error('Database not connected. Call connectDB first.');
  }
  return database;
}

/**
 * Close the database connection
 */
async function closeDB() {
  if (mongoClient) {
    await mongoClient.close();
    logger.info('MongoDB connection closed');
    mongoClient = null;
    database = null;
  }
}

// =============================================================================
// MODULE EXPORTS
// =============================================================================

module.exports = {
  connectDB,
  getDB,
  closeDB
};
