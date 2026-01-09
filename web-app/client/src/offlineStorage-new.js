/**
 * @file offlineStorage.js
 * @description IndexedDB wrapper for offline data storage and synchronization
 * Provides a robust local database for PWA offline functionality
 * 
 * @author 26:07 Electronics
 * @version 2.0.0
 */

/**
 * Store names used in IndexedDB
 * @constant {Object}
 */
const STORE_NAMES = {
  TRANSACTIONS: 'offlineTransactions',
  PRODUCTS: 'products',
  CUSTOMERS: 'customers',
  BILLS: 'bills',
  SETTINGS: 'settings',
};

/**
 * Database configuration
 * @constant {Object}
 */
const DB_CONFIG = {
  NAME: 'InventoryOfflineDB',
  VERSION: 1,
  MAX_CACHED_BILLS: 100,
  CACHE_EXPIRY_DAYS: 7,
};

/**
 * OfflineStorage Class
 * 
 * Manages offline data storage using IndexedDB with support for:
 * - Transaction queue for offline operations
 * - Local caching of products, customers, and bills
 * - Settings persistence
 * - Automatic cleanup of old data
 * 
 * @class
 * @example
 * const storage = new OfflineStorage();
 * await storage.init();
 * await storage.cacheProducts(products);
 * const cached = await storage.getCachedProducts();
 */
class OfflineStorage {
  /**
   * Create an OfflineStorage instance
   */
  constructor() {
    /** @type {IDBDatabase|null} */
    this.db = null;
    
    /** @type {string} */
    this.dbName = DB_CONFIG.NAME;
    
    /** @type {number} */
    this.dbVersion = DB_CONFIG.VERSION;
    
    console.log('📦 OfflineStorage instance created');
  }

  /**
   * Initialize IndexedDB connection and create object stores
   * 
   * @returns {Promise<IDBDatabase>} Database instance
   * @throws {Error} If database initialization fails
   * 
   * @example
   * await storage.init();
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        const error = request.error;
        console.error('❌ IndexedDB error:', error);
        reject(error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB initialized');
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log('🔧 Setting up IndexedDB schema...');
        
        this._createStores(db);
        
        console.log('✅ IndexedDB schema created');
      };
    });
  }

  /**
   * Create all object stores and indexes
   * @private
   * @param {IDBDatabase} db - Database instance
   */
  _createStores(db) {
    // Offline transactions store - queued operations for sync
    if (!db.objectStoreNames.contains(STORE_NAMES.TRANSACTIONS)) {
      const transactionStore = db.createObjectStore(STORE_NAMES.TRANSACTIONS, {
        keyPath: 'id',
        autoIncrement: true,
      });
      transactionStore.createIndex('timestamp', 'timestamp', { unique: false });
      transactionStore.createIndex('status', 'status', { unique: false });
    }
    
    // Products cache store
    if (!db.objectStoreNames.contains(STORE_NAMES.PRODUCTS)) {
      const productStore = db.createObjectStore(STORE_NAMES.PRODUCTS, {
        keyPath: '_id',
      });
      productStore.createIndex('name', 'name', { unique: false });
      productStore.createIndex('category', 'category', { unique: false });
      productStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
    }
    
    // Customers cache store
    if (!db.objectStoreNames.contains(STORE_NAMES.CUSTOMERS)) {
      const customerStore = db.createObjectStore(STORE_NAMES.CUSTOMERS, {
        keyPath: '_id',
      });
      customerStore.createIndex('name', 'name', { unique: false });
      customerStore.createIndex('phone', 'phone', { unique: false });
      customerStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
    }
    
    // Bills cache store - recent transactions
    if (!db.objectStoreNames.contains(STORE_NAMES.BILLS)) {
      const billStore = db.createObjectStore(STORE_NAMES.BILLS, {
        keyPath: '_id',
      });
      billStore.createIndex('billNumber', 'billNumber', { unique: false });
      billStore.createIndex('date', 'date', { unique: false });
      billStore.createIndex('total', 'total', { unique: false });
      billStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
    }
    
    // App settings store
    if (!db.objectStoreNames.contains(STORE_NAMES.SETTINGS)) {
      db.createObjectStore(STORE_NAMES.SETTINGS, {
        keyPath: 'key',
      });
    }
  }

  /**
   * Ensure database is initialized
   * @private
   * @returns {Promise<void>}
   */
  async _ensureDb() {
    if (!this.db) {
      await this.init();
    }
  }

  // ==================== GENERIC CRUD OPERATIONS ====================

  /**
   * Add data to a store
   * 
   * @param {string} storeName - Name of the object store
   * @param {Object} data - Data to add
   * @returns {Promise<IDBValidKey>} Generated key
   * 
   * @example
   * await storage.addData('products', { name: 'Phone', price: 10000 });
   */
  async addData(storeName, data) {
    await this._ensureDb();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const dataWithTimestamp = {
        ...data,
        lastUpdated: new Date().toISOString(),
      };
      
      const request = store.add(dataWithTimestamp);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update data in a store (upsert)
   * 
   * @param {string} storeName - Name of the object store
   * @param {Object} data - Data to update
   * @returns {Promise<IDBValidKey>} Updated key
   * 
   * @example
   * await storage.updateData('products', { _id: '123', name: 'Updated Phone' });
   */
  async updateData(storeName, data) {
    await this._ensureDb();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const dataWithTimestamp = {
        ...data,
        lastUpdated: new Date().toISOString(),
      };
      
      const request = store.put(dataWithTimestamp);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all data from a store
   * 
   * @param {string} storeName - Name of the object store
   * @returns {Promise<Array>} All records from the store
   * 
   * @example
   * const products = await storage.getAllData('products');
   */
  async getAllData(storeName) {
    await this._ensureDb();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get data by ID
   * 
   * @param {string} storeName - Name of the object store
   * @param {IDBValidKey} id - Record ID
   * @returns {Promise<Object|undefined>} Record or undefined if not found
   * 
   * @example
   * const product = await storage.getDataById('products', '123');
   */
  async getDataById(storeName, id) {
    await this._ensureDb();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete data by ID
   * 
   * @param {string} storeName - Name of the object store
   * @param {IDBValidKey} id - Record ID to delete
   * @returns {Promise<undefined>}
   * 
   * @example
   * await storage.deleteData('products', '123');
   */
  async deleteData(storeName, id) {
    await this._ensureDb();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all data from a store
   * 
   * @param {string} storeName - Name of the object store
   * @returns {Promise<undefined>}
   * 
   * @example
   * await storage.clearStore('products');
   */
  async clearStore(storeName) {
    await this._ensureDb();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== OFFLINE TRANSACTION OPERATIONS ====================

  /**
   * Save a transaction for later synchronization
   * 
   * @param {Object} billData - Bill/transaction data
   * @param {string} token - Authentication token
   * @returns {Promise<IDBValidKey>} Transaction ID
   * 
   * @example
   * const txId = await storage.saveOfflineTransaction(billData, authToken);
   */
  async saveOfflineTransaction(billData, token) {
    const transaction = {
      data: billData,
      token: token,
      timestamp: new Date().toISOString(),
      status: 'pending',
      retryCount: 0,
    };
    
    return this.addData(STORE_NAMES.TRANSACTIONS, transaction);
  }

  /**
   * Get all pending offline transactions
   * 
   * @returns {Promise<Array>} Array of pending transactions
   * 
   * @example
   * const pending = await storage.getOfflineTransactions();
   */
  async getOfflineTransactions() {
    return this.getAllData(STORE_NAMES.TRANSACTIONS);
  }

  /**
   * Remove a synced offline transaction
   * 
   * @param {IDBValidKey} id - Transaction ID
   * @returns {Promise<undefined>}
   * 
   * @example
   * await storage.removeOfflineTransaction(txId);
   */
  async removeOfflineTransaction(id) {
    return this.deleteData(STORE_NAMES.TRANSACTIONS, id);
  }

  /**
   * Update offline transaction status after sync attempt
   * 
   * @param {IDBValidKey} id - Transaction ID
   * @param {string} status - New status ('pending', 'synced', 'failed')
   * @returns {Promise<IDBValidKey>}
   * 
   * @example
   * await storage.updateOfflineTransactionStatus(txId, 'synced');
   */
  async updateOfflineTransactionStatus(id, status) {
    const transaction = await this.getDataById(STORE_NAMES.TRANSACTIONS, id);
    if (transaction) {
      transaction.status = status;
      transaction.retryCount = (transaction.retryCount || 0) + 1;
      return this.updateData(STORE_NAMES.TRANSACTIONS, transaction);
    }
  }

  // ==================== CACHE MANAGEMENT ====================

  /**
   * Cache all products for offline access
   * 
   * @param {Array} products - Array of product objects
   * @returns {Promise<Array>} Array of promises
   * 
   * @example
   * await storage.cacheProducts(productsArray);
   */
  async cacheProducts(products) {
    await this.clearStore(STORE_NAMES.PRODUCTS);
    const promises = products.map(product => this.updateData(STORE_NAMES.PRODUCTS, product));
    return Promise.all(promises);
  }

  /**
   * Get cached products
   * 
   * @returns {Promise<Array>} Array of cached products
   * 
   * @example
   * const products = await storage.getCachedProducts();
   */
  async getCachedProducts() {
    return this.getAllData(STORE_NAMES.PRODUCTS);
  }

  /**
   * Cache all customers for offline access
   * 
   * @param {Array} customers - Array of customer objects
   * @returns {Promise<Array>} Array of promises
   * 
   * @example
   * await storage.cacheCustomers(customersArray);
   */
  async cacheCustomers(customers) {
    await this.clearStore(STORE_NAMES.CUSTOMERS);
    const promises = customers.map(customer => this.updateData(STORE_NAMES.CUSTOMERS, customer));
    return Promise.all(promises);
  }

  /**
   * Get cached customers
   * 
   * @returns {Promise<Array>} Array of cached customers
   * 
   * @example
   * const customers = await storage.getCachedCustomers();
   */
  async getCachedCustomers() {
    return this.getAllData(STORE_NAMES.CUSTOMERS);
  }

  /**
   * Cache recent bills for offline access
   * Limited to last 100 bills to conserve space
   * 
   * @param {Array} bills - Array of bill objects
   * @returns {Promise<Array>} Array of promises
   * 
   * @example
   * await storage.cacheBills(billsArray);
   */
  async cacheBills(bills) {
    await this.clearStore(STORE_NAMES.BILLS);
    
    // Limit to recent bills
    const recentBills = bills.slice(-DB_CONFIG.MAX_CACHED_BILLS);
    const promises = recentBills.map(bill => this.updateData(STORE_NAMES.BILLS, bill));
    return Promise.all(promises);
  }

  /**
   * Get cached bills
   * 
   * @returns {Promise<Array>} Array of cached bills
   * 
   * @example
   * const bills = await storage.getCachedBills();
   */
  async getCachedBills() {
    return this.getAllData(STORE_NAMES.BILLS);
  }

  // ==================== SETTINGS MANAGEMENT ====================

  /**
   * Save an app setting
   * 
   * @param {string} key - Setting key
   * @param {*} value - Setting value (any serializable type)
   * @returns {Promise<IDBValidKey>}
   * 
   * @example
   * await storage.saveSetting('theme', 'dark');
   */
  async saveSetting(key, value) {
    return this.updateData(STORE_NAMES.SETTINGS, { key, value });
  }

  /**
   * Get an app setting
   * 
   * @param {string} key - Setting key
   * @returns {Promise<*>} Setting value or null if not found
   * 
   * @example
   * const theme = await storage.getSetting('theme');
   */
  async getSetting(key) {
    const setting = await this.getDataById(STORE_NAMES.SETTINGS, key);
    return setting ? setting.value : null;
  }

  // ==================== MAINTENANCE ====================

  /**
   * Get storage statistics for all stores
   * 
   * @returns {Promise<Object>} Object with stats for each store
   * 
   * @example
   * const stats = await storage.getStorageStats();
   * console.log(`Products: ${stats.products.count} items, ${stats.products.size} bytes`);
   */
  async getStorageStats() {
    const stats = {};
    const stores = Object.values(STORE_NAMES);
    
    for (const store of stores) {
      const data = await this.getAllData(store);
      stats[store] = {
        count: data.length,
        size: JSON.stringify(data).length,
      };
    }
    
    return stats;
  }

  /**
   * Clean up old cached data (older than configured days)
   * 
   * @returns {Promise<void>}
   * 
   * @example
   * await storage.cleanup();
   */
  async cleanup() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DB_CONFIG.CACHE_EXPIRY_DAYS);
    const cutoffISO = cutoffDate.toISOString();
    
    const stores = [STORE_NAMES.PRODUCTS, STORE_NAMES.CUSTOMERS, STORE_NAMES.BILLS];
    
    for (const storeName of stores) {
      const data = await this.getAllData(storeName);
      const oldData = data.filter(item => 
        item.lastUpdated && item.lastUpdated < cutoffISO
      );
      
      for (const item of oldData) {
        await this.deleteData(storeName, item._id);
      }
      
      if (oldData.length > 0) {
        console.log(`🧹 Cleaned ${oldData.length} old records from ${storeName}`);
      }
    }
  }
}

// ==================== MODULE EXPORTS ====================

// Create and export global instance
const offlineStorage = new OfflineStorage();

// CommonJS export for compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OfflineStorage;
}

// ES6 export
export default OfflineStorage;
export { offlineStorage, STORE_NAMES, DB_CONFIG };

// ==================== AUTO-INITIALIZATION ====================

/**
 * Initialize storage when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  offlineStorage.init()
    .then(() => console.log('📦 Offline storage ready'))
    .catch(err => console.error('❌ Failed to initialize offline storage:', err));
});

console.log('📦 Offline storage module loaded');
