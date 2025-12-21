"""
SQLite Database Manager for Inventory System
"""
import sqlite3
import os
from datetime import datetime
from werkzeug.security import generate_password_hash
from config import Config

def get_db():
    """Get database connection with row factory"""
    conn = sqlite3.connect(Config.DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database with all tables"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            email TEXT,
            role TEXT DEFAULT 'cashier',
            is_active INTEGER DEFAULT 1,
            is_approved INTEGER DEFAULT 0,
            approved_by INTEGER,
            photo TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (approved_by) REFERENCES users(id)
        )
    ''')
    
    # Products table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            hsn_code TEXT DEFAULT '9999',
            quantity INTEGER DEFAULT 0,
            cost_price REAL DEFAULT 0.0,
            price REAL DEFAULT 0.0,
            min_stock INTEGER DEFAULT 10,
            barcode TEXT,
            photo TEXT,
            category TEXT DEFAULT 'General',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    ''')
    
    # Customers table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT,
            address TEXT,
            place TEXT,
            pincode TEXT,
            gstin TEXT,
            customer_type TEXT DEFAULT 'B2C',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Bills table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bill_number TEXT UNIQUE NOT NULL,
            customer_id INTEGER,
            customer_name TEXT NOT NULL,
            customer_phone TEXT,
            customer_address TEXT,
            customer_state TEXT DEFAULT 'Same',
            subtotal REAL DEFAULT 0.0,
            discount_percent REAL DEFAULT 0.0,
            discount_amount REAL DEFAULT 0.0,
            cgst REAL DEFAULT 0.0,
            sgst REAL DEFAULT 0.0,
            igst REAL DEFAULT 0.0,
            gst_amount REAL DEFAULT 0.0,
            grand_total REAL DEFAULT 0.0,
            total_profit REAL DEFAULT 0.0,
            payment_mode TEXT DEFAULT 'cash',
            payment_status TEXT DEFAULT 'Paid',
            created_by INTEGER,
            created_by_username TEXT,
            bill_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    ''')
    
    # Bill items table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bill_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bill_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            product_name TEXT NOT NULL,
            hsn_code TEXT DEFAULT '9999',
            quantity INTEGER DEFAULT 1,
            cost_price REAL DEFAULT 0.0,
            unit_price REAL DEFAULT 0.0,
            line_subtotal REAL DEFAULT 0.0,
            line_profit REAL DEFAULT 0.0,
            FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
    ''')
    
    # Expenses table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            amount REAL NOT NULL,
            description TEXT,
            expense_date DATE,
            created_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    ''')
    
    # Audit logs table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            user_id INTEGER,
            username TEXT,
            details TEXT,
            ip_address TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # Create default admin user if not exists
    cursor.execute("SELECT id FROM users WHERE username = 'admin'")
    if not cursor.fetchone():
        cursor.execute('''
            INSERT INTO users (username, password_hash, email, role, is_approved)
            VALUES (?, ?, ?, ?, ?)
        ''', ('admin', generate_password_hash('shahinsha'), 'admin@store.com', 'admin', 1))
    else:
        # Update existing admin password to 'shahinsha' and ensure approved
        cursor.execute('''
            UPDATE users SET password_hash = ?, is_approved = 1 WHERE username = 'admin'
        ''', (generate_password_hash('shahinsha'),))
    
    # Create walk-in customer if not exists
    cursor.execute("SELECT id FROM customers WHERE name = 'Walk-in Customer'")
    if not cursor.fetchone():
        cursor.execute('''
            INSERT INTO customers (name, phone, address, customer_type)
            VALUES (?, ?, ?, ?)
        ''', ('Walk-in Customer', '', 'Counter Sale', 'B2C'))
    
    conn.commit()
    conn.close()
    print("✅ Database initialized successfully!")

def add_sample_data():
    """Add sample products and customers"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if products exist
    cursor.execute("SELECT COUNT(*) FROM products")
    if cursor.fetchone()[0] == 0:
        # Sample products
        products = [
            ('Samsung Galaxy S24', '85171200', 25, 85000.00, 119999.00, 5, 'SG24001', 'Mobile'),
            ('Apple iPhone 15', '85171200', 15, 65000.00, 99999.00, 5, 'IP15001', 'Mobile'),
            ('OnePlus 12', '85171200', 30, 45000.00, 69999.00, 5, 'OP12001', 'Mobile'),
            ('Dell XPS 13 Laptop', '84713000', 10, 75000.00, 124999.00, 3, 'DL13001', 'Laptop'),
            ('HP Pavilion 15', '84713000', 20, 45000.00, 64999.00, 5, 'HP15001', 'Laptop'),
            ('Sony WH-1000XM5', '85183000', 50, 18000.00, 29999.00, 10, 'WH1000XM5', 'Audio'),
            ('Samsung 55" 4K TV', '85287200', 8, 35000.00, 54999.00, 2, 'SS55TV001', 'Electronics'),
            ('Apple AirPods Pro', '85183000', 40, 15000.00, 24900.00, 10, 'APP001', 'Audio'),
            ('Wireless Mouse', '84716070', 100, 800.00, 1999.00, 20, 'WM001', 'Accessories'),
            ('Mechanical Keyboard', '84716070', 60, 3500.00, 6999.00, 15, 'MK001', 'Accessories'),
        ]
        
        cursor.executemany('''
            INSERT INTO products (name, hsn_code, quantity, cost_price, price, min_stock, barcode, category)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', products)
        
        # Sample customers
        customers = [
            ('Rajesh Kumar', '9876543210', '123 MG Road, Bangalore', 'Bangalore', '560001', '29ABCDE1234F1Z5', 'B2B'),
            ('Priya Sharma', '9876543211', '456 Brigade Road, Bangalore', 'Bangalore', '560002', '', 'B2C'),
            ('Tech Solutions Pvt Ltd', '9876543212', '789 Whitefield, Bangalore', 'Bangalore', '560066', '29FGHIJ5678K2L6', 'B2B'),
            ('Amit Patel', '9876543213', '321 Koramangala, Bangalore', 'Bangalore', '560034', '', 'B2C'),
        ]
        
        cursor.executemany('''
            INSERT INTO customers (name, phone, address, place, pincode, gstin, customer_type)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', customers)
        
        conn.commit()
        print("✅ Sample data added!")
    
    conn.close()

if __name__ == '__main__':
    init_db()
    add_sample_data()
