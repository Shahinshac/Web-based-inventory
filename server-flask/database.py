from pymongo import MongoClient
import certifi
import sys
import logging

# Simple global variables to hold the connection state
client = None
db = None

logger = logging.getLogger(__name__)

def connect_db(app):
    """
    Establish a connection to MongoDB and attach it to the global context.
    Creates necessary indexes if required.
    """
    global client, db
    
    mongo_uri = app.config.get('MONGO_URI')
    db_name = app.config.get('DB_NAME')
    
    if not mongo_uri:
        logger.error("MONGO_URI not set in application configuration!")
        return None

    try:
        # Construct MongoClient
        # For localhost MongoDB, we don't need TLS
        is_local = 'localhost' in mongo_uri or '127.0.0.1' in mongo_uri
        
        if is_local:
            client = MongoClient(
                mongo_uri,
                serverSelectionTimeoutMS=10000,
                socketTimeoutMS=45000,
            )
        else:
            # For remote MongoDB (like MongoDB Atlas), use TLS
            client = MongoClient(
                mongo_uri, 
                tlsCAFile=certifi.where(),
                serverSelectionTimeoutMS=10000,
                socketTimeoutMS=45000,
            )
        # Test connection
        client.admin.command('ping')
        
        db = client[db_name]
        logger.info(f"✅ Successfully connected to MongoDB Database: {db_name}")
        
        # Create minimal indexes
        _create_indexes(db)
        
        return db
    except Exception as e:
        logger.error(f"❌ Failed to connect to MongoDB: {e}")
        return None

def get_db():
    """Returns the globally connected database."""
    if db is None:
        raise Exception("Database not connected. Ensure connect_db is called on startup.")
    return db

def _create_indexes(database):
    """Creates indexes exactly as the Node app did for optimal query performance."""
    try:
        # Users indexes
        database.users.create_index("username", unique=True)
        database.users.create_index("email", unique=True, sparse=True)
        database.users.create_index("approved")
        database.users.create_index("role")
        database.users.create_index("lastLogin")
        
        # Customers indexes (for fast lookups)
        database.customers.create_index("email", unique=True, sparse=True)
        database.customers.create_index("phone", sparse=True)
        database.customers.create_index("name")
        
        # Bills/Invoices indexes (for Customer Portal reconciliation)
        database.bills.create_index("billNumber", unique=True)
        database.bills.create_index("billDate")
        database.bills.create_index("customerId")
        database.bills.create_index("customerEmail")
        database.bills.create_index("customerPhone")
        
        # Warranties indexes
        database.warranties.create_index("customerId")
        database.warranties.create_index("customerEmail")
        database.warranties.create_index("customerPhone")
        database.warranties.create_index("expiryDate")
        database.warranties.create_index("invoiceNo")
        
        logger.info("🔧 Core & Performance Database Indexes Created Successfully.")
    except Exception as e:
        logger.warning(f"Index creation warning: {e}")
