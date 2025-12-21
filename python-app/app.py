"""
Flask Inventory Management System - Main Application
Complete Python-based POS and Inventory System
"""
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, session
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from datetime import datetime, timedelta
from collections import defaultdict
import json
import os
import io
import base64
import time

from config import Config
from database import get_db, init_db, add_sample_data

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)

# Security configurations
app.config['SESSION_COOKIE_SECURE'] = False  # Set True in production with HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=2)
app.config['WTF_CSRF_ENABLED'] = False  # Disabled for now - enable in production with proper setup

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Please log in to access this page.'

# Rate limiting dictionary
login_attempts = defaultdict(lambda: {'count': 0, 'timestamp': time.time()})

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# ============================================================================
# USER AUTHENTICATION
# ============================================================================

class User(UserMixin):
    def __init__(self, id, username, email, role, photo=None):
        self.id = id
        self.username = username
        self.email = email
        self.role = role
        self.photo = photo
    
    def is_admin(self):
        return self.role == 'admin'
    
    def is_manager(self):
        return self.role in ['admin', 'manager']

@login_manager.user_loader
def load_user(user_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT id, username, email, role, photo FROM users WHERE id = ?', (user_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return User(row['id'], row['username'], row['email'], row['role'], row['photo'])
    return None

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin():
            flash('Admin access required.', 'error')
            return redirect(url_for('dashboard'))
        return f(*args, **kwargs)
    return decorated_function

def manager_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_manager():
            flash('Manager access required.', 'error')
            return redirect(url_for('dashboard'))
        return f(*args, **kwargs)
    return decorated_function

def log_audit(action, details=None):
    """Log audit trail entry"""
    conn = get_db()
    cursor = conn.cursor()
    user_id = current_user.id if current_user.is_authenticated else None
    username = current_user.username if current_user.is_authenticated else 'System'
    ip = request.remote_addr
    cursor.execute('''
        INSERT INTO audit_logs (action, user_id, username, details, ip_address)
        VALUES (?, ?, ?, ?, ?)
    ''', (action, user_id, username, json.dumps(details) if details else None, ip))
    conn.commit()
    conn.close()

# ============================================================================
# CONTEXT PROCESSORS
# ============================================================================

@app.context_processor
def inject_globals():
    """Inject global variables into all templates"""
    return {
        'company': {
            'name': Config.COMPANY_NAME,
            'address': Config.COMPANY_ADDRESS,
            'phone': Config.COMPANY_PHONE,
            'email': Config.COMPANY_EMAIL,
            'gstin': Config.COMPANY_GSTIN
        },
        'now': datetime.now(),
        'gst_rate': Config.GST_RATE
    }

# ============================================================================
# AUTHENTICATION ROUTES
# ============================================================================

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        ip = request.remote_addr
        current_time = time.time()
        
        # Rate limiting: Check login attempts
        if login_attempts[ip]['count'] >= 5:
            if current_time - login_attempts[ip]['timestamp'] < 900:  # 15 minutes
                remaining = int(900 - (current_time - login_attempts[ip]['timestamp']))
                flash(f'Too many login attempts. Please try again in {remaining // 60} minutes.', 'error')
                return render_template('login.html')
            else:
                # Reset after 15 minutes
                login_attempts[ip] = {'count': 0, 'timestamp': current_time}
        
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        
        # Prevent admin username from being used in login page
        if username.lower() == 'admin':
            flash('Invalid username or password.', 'error')
            login_attempts[ip]['count'] += 1
            login_attempts[ip]['timestamp'] = current_time
            return render_template('login.html')
        
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
        user = cursor.fetchone()
        conn.close()
        
        if not user:
            login_attempts[ip]['count'] += 1
            login_attempts[ip]['timestamp'] = current_time
            flash('Invalid username or password.', 'error')
            return render_template('login.html')
        
        if not user['is_approved']:
            flash('Your account is pending admin approval.', 'error')
            return render_template('login.html')
        
        if not user['is_active']:
            flash('Your account has been deactivated. Contact administrator.', 'error')
            return render_template('login.html')
        
        if check_password_hash(user['password_hash'], password):
            # Reset login attempts on successful login
            login_attempts[ip] = {'count': 0, 'timestamp': current_time}
            
            user_obj = User(user['id'], user['username'], user['email'], user['role'], user['photo'])
            login_user(user_obj, remember=True)
            session.permanent = True
            log_audit('LOGIN', {'username': username, 'ip': ip})
            flash(f'Welcome back, {username}!', 'success')
            return redirect(url_for('dashboard'))
        else:
            login_attempts[ip]['count'] += 1
            login_attempts[ip]['timestamp'] = current_time
            flash('Invalid username or password.', 'error')
    
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')
        
        # Prevent admin username registration
        if username.lower() == 'admin':
            flash('This username is not available.', 'error')
            return render_template('login.html', show_register=True)
        
        if not username or not password:
            flash('Username and password are required.', 'error')
            return render_template('login.html', show_register=True)
        
        if password != confirm_password:
            flash('Passwords do not match.', 'error')
            return render_template('login.html', show_register=True)
        
        if len(password) < 8:
            flash('Password must be at least 8 characters.', 'error')
            return render_template('login.html', show_register=True)
        
        conn = get_db()
        cursor = conn.cursor()
        
        # Check if username exists
        cursor.execute('SELECT id FROM users WHERE username = ?', (username,))
        if cursor.fetchone():
            conn.close()
            flash('Username already exists.', 'error')
            return render_template('login.html', show_register=True)
        
        # Create user with pending approval (is_approved = 0)
        cursor.execute('''
            INSERT INTO users (username, password_hash, email, role, is_approved, is_active)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (username, generate_password_hash(password), email, 'cashier', 0, 0))
        conn.commit()
        conn.close()
        
        log_audit('USER_REGISTRATION_REQUEST', {'username': username, 'email': email})
        flash('Registration successful! Your account is pending admin approval.', 'success')
        return redirect(url_for('login'))
    
    return render_template('login.html', show_register=True)

@app.route('/sys-admin', methods=['GET', 'POST'])
def admin_login():
    """Hidden admin login page at /sys-admin"""
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        ip = request.remote_addr
        current_time = time.time()
        
        # Strict rate limiting for admin: 3 attempts
        admin_key = f'admin_{ip}'
        if login_attempts[admin_key]['count'] >= 3:
            if current_time - login_attempts[admin_key]['timestamp'] < 1800:  # 30 minutes
                remaining = int(1800 - (current_time - login_attempts[admin_key]['timestamp']))
                flash(f'Access denied. Try again in {remaining // 60} minutes.', 'error')
                return render_template('admin_login.html')
            else:
                login_attempts[admin_key] = {'count': 0, 'timestamp': current_time}
        
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        
        # Only allow admin username here
        if username.lower() != 'admin':
            flash('Invalid administrator credentials.', 'error')
            login_attempts[admin_key]['count'] += 1
            login_attempts[admin_key]['timestamp'] = current_time
            return render_template('admin_login.html')
        
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE username = ? AND role = ? AND is_active = 1', (username, 'admin'))
        user = cursor.fetchone()
        conn.close()
        
        if user and check_password_hash(user['password_hash'], password):
            login_attempts[admin_key] = {'count': 0, 'timestamp': current_time}
            user_obj = User(user['id'], user['username'], user['email'], user['role'], user['photo'])
            login_user(user_obj, remember=True)
            session.permanent = True
            log_audit('ADMIN_LOGIN', {'username': username, 'ip': ip})
            flash(f'Welcome, System Administrator!', 'success')
            return redirect(url_for('dashboard'))
        else:
            login_attempts[admin_key]['count'] += 1
            login_attempts[admin_key]['timestamp'] = current_time
            flash('Invalid administrator credentials.', 'error')
    
    return render_template('admin_login.html')

@app.route('/logout')
@login_required
def logout():
    log_audit('LOGOUT', {'username': current_user.username})
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('login'))

# ============================================================================
# USER APPROVAL SYSTEM
# ============================================================================

@app.route('/user-approvals')
@login_required
@admin_required
def user_approvals():
    """Admin page to view and approve pending user registrations"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, username, email, created_at 
        FROM users 
        WHERE is_approved = 0 
        ORDER BY created_at DESC
    ''')
    pending_users = cursor.fetchall()
    conn.close()
    return render_template('user_approvals.html', pending_users=pending_users, active_tab='user_approvals')

@app.route('/approve-user/<int:user_id>', methods=['POST'])
@login_required
@admin_required
def approve_user(user_id):
    """Approve a pending user and assign role"""
    role = request.form.get('role', 'cashier')
    
    # Validate role
    if role not in ['cashier', 'manager', 'admin']:
        flash('Invalid role selected.', 'error')
        return redirect(url_for('user_approvals'))
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Get user details
    cursor.execute('SELECT username FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()
    
    if not user:
        conn.close()
        flash('User not found.', 'error')
        return redirect(url_for('user_approvals'))
    
    # Approve user
    cursor.execute('''
        UPDATE users 
        SET is_approved = 1, is_active = 1, role = ?, approved_by = ? 
        WHERE id = ?
    ''', (role, current_user.id, user_id))
    conn.commit()
    conn.close()
    
    log_audit('USER_APPROVED', {
        'user_id': user_id,
        'username': user['username'],
        'role': role,
        'approved_by': current_user.username
    })
    
    flash(f'User {user["username"]} approved as {role.title()}!', 'success')
    return redirect(url_for('user_approvals'))

@app.route('/reject-user/<int:user_id>', methods=['POST'])
@login_required
@admin_required
def reject_user(user_id):
    """Reject and delete a pending user"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get user details
    cursor.execute('SELECT username FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()
    
    if not user:
        conn.close()
        flash('User not found.', 'error')
        return redirect(url_for('user_approvals'))
    
    # Delete user
    cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
    conn.commit()
    conn.close()
    
    log_audit('USER_REJECTED', {
        'user_id': user_id,
        'username': user['username'],
        'rejected_by': current_user.username
    })
    
    flash(f'User {user["username"]} rejected and removed.', 'info')
    return redirect(url_for('user_approvals'))

# ============================================================================
# DASHBOARD
# ============================================================================

@app.route('/')
@app.route('/dashboard')
@login_required
def dashboard():
    conn = get_db()
    cursor = conn.cursor()
    
    # Get statistics
    today = datetime.now().strftime('%Y-%m-%d')
    
    # Total products and low stock
    cursor.execute('SELECT COUNT(*) as total, SUM(CASE WHEN quantity <= min_stock THEN 1 ELSE 0 END) as low_stock FROM products')
    product_stats = cursor.fetchone()
    
    # Total customers
    cursor.execute('SELECT COUNT(*) as total FROM customers')
    customer_count = cursor.fetchone()['total']
    
    # Pending user approvals (admin only)
    pending_approvals = 0
    if current_user.is_admin():
        cursor.execute('SELECT COUNT(*) as count FROM users WHERE is_approved = 0')
        pending_approvals = cursor.fetchone()['count']
    
    # Today's sales
    cursor.execute('''
        SELECT COUNT(*) as count, COALESCE(SUM(grand_total), 0) as total, COALESCE(SUM(total_profit), 0) as profit
        FROM bills WHERE DATE(bill_date) = ?
    ''', (today,))
    today_sales = cursor.fetchone()
    
    # Monthly sales
    month_start = datetime.now().replace(day=1).strftime('%Y-%m-%d')
    cursor.execute('''
        SELECT COUNT(*) as count, COALESCE(SUM(grand_total), 0) as total, COALESCE(SUM(total_profit), 0) as profit
        FROM bills WHERE DATE(bill_date) >= ?
    ''', (month_start,))
    month_sales = cursor.fetchone()
    
    # Recent transactions
    cursor.execute('''
        SELECT b.*, u.username as created_by_name
        FROM bills b
        LEFT JOIN users u ON b.created_by = u.id
        ORDER BY b.bill_date DESC LIMIT 10
    ''')
    recent_bills = cursor.fetchall()
    
    # Low stock products
    cursor.execute('''
        SELECT * FROM products WHERE quantity <= min_stock ORDER BY quantity ASC LIMIT 10
    ''')
    low_stock_products = cursor.fetchall()
    
    # Top selling products (this month)
    cursor.execute('''
        SELECT p.name, SUM(bi.quantity) as sold, SUM(bi.line_subtotal) as revenue
        FROM bill_items bi
        JOIN products p ON bi.product_id = p.id
        JOIN bills b ON bi.bill_id = b.id
        WHERE DATE(b.bill_date) >= ?
        GROUP BY bi.product_id
        ORDER BY sold DESC LIMIT 5
    ''', (month_start,))
    top_products = cursor.fetchall()
    
    conn.close()
    
    stats = {
        'total_products': product_stats['total'] or 0,
        'low_stock_count': product_stats['low_stock'] or 0,
        'total_customers': customer_count,
        'today_sales_count': today_sales['count'],
        'today_sales_total': today_sales['total'],
        'today_profit': today_sales['profit'],
        'month_sales_count': month_sales['count'],
        'month_sales_total': month_sales['total'],
        'month_profit': month_sales['profit'],
        'pending_approvals': pending_approvals,
    }
    
    return render_template('dashboard.html', 
                         stats=stats, 
                         recent_bills=recent_bills,
                         low_stock_products=low_stock_products,
                         top_products=top_products,
                         active_tab='dashboard')

# ============================================================================
# POS (Point of Sale)
# ============================================================================

@app.route('/pos')
@login_required
def pos():
    conn = get_db()
    cursor = conn.cursor()
    
    # Get all products with stock
    cursor.execute('SELECT * FROM products WHERE quantity > 0 ORDER BY name')
    products = cursor.fetchall()
    
    # Get all customers
    cursor.execute('SELECT * FROM customers ORDER BY name')
    customers = cursor.fetchall()
    
    conn.close()
    
    return render_template('pos.html', 
                         products=products, 
                         customers=customers,
                         active_tab='pos')

@app.route('/api/checkout', methods=['POST'])
@login_required
def checkout():
    data = request.get_json()
    
    cart = data.get('cart', [])
    customer_id = data.get('customer_id')
    discount_percent = float(data.get('discount_percent', 0))
    payment_mode = data.get('payment_mode', 'cash').lower()
    customer_state = data.get('customer_state', 'Same')
    
    if not cart:
        return jsonify({'error': 'Cart is empty'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Get customer info
        customer_name = 'Walk-in Customer'
        customer_phone = ''
        customer_address = ''
        
        if customer_id:
            cursor.execute('SELECT * FROM customers WHERE id = ?', (customer_id,))
            customer = cursor.fetchone()
            if customer:
                customer_name = customer['name']
                customer_phone = customer['phone'] or ''
                customer_address = customer['address'] or ''
        
        # Generate bill number
        year = datetime.now().year
        cursor.execute("SELECT COUNT(*) FROM bills WHERE bill_number LIKE ?", (f'INV-{year}-%',))
        count = cursor.fetchone()[0]
        bill_number = f'INV-{year}-{str(count + 1).zfill(4)}'
        
        # Calculate totals
        subtotal = 0
        total_cost = 0
        items = []
        
        for item in cart:
            cursor.execute('SELECT * FROM products WHERE id = ?', (item['product_id'],))
            product = cursor.fetchone()
            
            if not product:
                continue
            
            if product['quantity'] < item['quantity']:
                return jsonify({'error': f'Insufficient stock for {product["name"]}'}), 400
            
            line_subtotal = product['price'] * item['quantity']
            line_cost = (product['cost_price'] or 0) * item['quantity']
            line_profit = line_subtotal - line_cost
            
            items.append({
                'product_id': product['id'],
                'product_name': product['name'],
                'hsn_code': product['hsn_code'] or '9999',
                'quantity': item['quantity'],
                'cost_price': product['cost_price'] or 0,
                'unit_price': product['price'],
                'line_subtotal': line_subtotal,
                'line_profit': line_profit
            })
            
            subtotal += line_subtotal
            total_cost += line_cost
            
            # Update product quantity
            cursor.execute('UPDATE products SET quantity = quantity - ? WHERE id = ?',
                         (item['quantity'], product['id']))
        
        # Calculate discount
        discount_amount = (subtotal * discount_percent) / 100
        after_discount = subtotal - discount_amount
        
        # Calculate GST
        is_same_state = customer_state == 'Same'
        if is_same_state:
            cgst = after_discount * 0.09
            sgst = after_discount * 0.09
            igst = 0
        else:
            cgst = 0
            sgst = 0
            igst = after_discount * 0.18
        
        gst_amount = cgst + sgst + igst
        grand_total = round(after_discount + gst_amount)
        total_profit = subtotal - total_cost - discount_amount
        
        # Insert bill
        cursor.execute('''
            INSERT INTO bills (bill_number, customer_id, customer_name, customer_phone, 
                             customer_address, customer_state, subtotal, discount_percent,
                             discount_amount, cgst, sgst, igst, gst_amount, grand_total,
                             total_profit, payment_mode, created_by, created_by_username)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (bill_number, customer_id, customer_name, customer_phone, customer_address,
              customer_state, subtotal, discount_percent, discount_amount, cgst, sgst,
              igst, gst_amount, grand_total, total_profit, payment_mode, 
              current_user.id, current_user.username))
        
        bill_id = cursor.lastrowid
        
        # Insert bill items
        for item in items:
            cursor.execute('''
                INSERT INTO bill_items (bill_id, product_id, product_name, hsn_code,
                                       quantity, cost_price, unit_price, line_subtotal, line_profit)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (bill_id, item['product_id'], item['product_name'], item['hsn_code'],
                  item['quantity'], item['cost_price'], item['unit_price'],
                  item['line_subtotal'], item['line_profit']))
        
        conn.commit()
        
        log_audit('SALE_COMPLETED', {
            'bill_number': bill_number,
            'customer_name': customer_name,
            'grand_total': grand_total,
            'items': len(items)
        })
        
        return jsonify({
            'success': True,
            'bill_id': bill_id,
            'bill_number': bill_number,
            'customer_name': customer_name,
            'subtotal': subtotal,
            'discount_amount': discount_amount,
            'gst_amount': gst_amount,
            'grand_total': grand_total
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

# ============================================================================
# PRODUCTS
# ============================================================================

@app.route('/products')
@login_required
def products():
    conn = get_db()
    cursor = conn.cursor()
    
    # Get filter parameters
    filter_type = request.args.get('filter', 'all')
    search = request.args.get('search', '')
    
    query = 'SELECT * FROM products WHERE 1=1'
    params = []
    
    if search:
        query += ' AND name LIKE ?'
        params.append(f'%{search}%')
    
    if filter_type == 'low-stock':
        query += ' AND quantity <= min_stock AND quantity > 0'
    elif filter_type == 'out-of-stock':
        query += ' AND quantity = 0'
    
    query += ' ORDER BY name'
    
    cursor.execute(query, params)
    products = cursor.fetchall()
    conn.close()
    
    return render_template('products.html', 
                         products=products, 
                         filter_type=filter_type,
                         search=search,
                         active_tab='products')

@app.route('/products/add', methods=['GET', 'POST'])
@login_required
@manager_required
def add_product():
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        hsn_code = request.form.get('hsn_code', '9999').strip()
        quantity = int(request.form.get('quantity', 0))
        cost_price = float(request.form.get('cost_price', 0))
        price = float(request.form.get('price', 0))
        min_stock = int(request.form.get('min_stock', 10))
        category = request.form.get('category', 'General').strip()
        
        if not name:
            flash('Product name is required.', 'error')
            return render_template('product_form.html', active_tab='products')
        
        # Generate barcode
        barcode = f"{name[:3].upper()}{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO products (name, hsn_code, quantity, cost_price, price, min_stock, barcode, category, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (name, hsn_code, quantity, cost_price, price, min_stock, barcode, category, current_user.id))
        conn.commit()
        product_id = cursor.lastrowid
        conn.close()
        
        log_audit('PRODUCT_ADDED', {'product_id': product_id, 'name': name})
        flash(f'Product "{name}" added successfully!', 'success')
        return redirect(url_for('products'))
    
    return render_template('product_form.html', product=None, active_tab='products')

@app.route('/products/<int:id>/edit', methods=['GET', 'POST'])
@login_required
@manager_required
def edit_product(id):
    conn = get_db()
    cursor = conn.cursor()
    
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        hsn_code = request.form.get('hsn_code', '9999').strip()
        quantity = int(request.form.get('quantity', 0))
        cost_price = float(request.form.get('cost_price', 0))
        price = float(request.form.get('price', 0))
        min_stock = int(request.form.get('min_stock', 10))
        category = request.form.get('category', 'General').strip()
        
        cursor.execute('''
            UPDATE products SET name=?, hsn_code=?, quantity=?, cost_price=?, price=?, min_stock=?, category=?
            WHERE id=?
        ''', (name, hsn_code, quantity, cost_price, price, min_stock, category, id))
        conn.commit()
        conn.close()
        
        log_audit('PRODUCT_UPDATED', {'product_id': id, 'name': name})
        flash(f'Product "{name}" updated successfully!', 'success')
        return redirect(url_for('products'))
    
    cursor.execute('SELECT * FROM products WHERE id = ?', (id,))
    product = cursor.fetchone()
    conn.close()
    
    if not product:
        flash('Product not found.', 'error')
        return redirect(url_for('products'))
    
    return render_template('product_form.html', product=product, active_tab='products')

@app.route('/products/<int:id>/delete', methods=['POST'])
@login_required
@admin_required
def delete_product(id):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT name FROM products WHERE id = ?', (id,))
    product = cursor.fetchone()
    
    if product:
        cursor.execute('DELETE FROM products WHERE id = ?', (id,))
        conn.commit()
        log_audit('PRODUCT_DELETED', {'product_id': id, 'name': product['name']})
        flash(f'Product "{product["name"]}" deleted.', 'success')
    
    conn.close()
    return redirect(url_for('products'))

# ============================================================================
# CUSTOMERS
# ============================================================================

@app.route('/customers')
@login_required
def customers():
    conn = get_db()
    cursor = conn.cursor()
    
    search = request.args.get('search', '')
    
    if search:
        cursor.execute('''
            SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? ORDER BY name
        ''', (f'%{search}%', f'%{search}%'))
    else:
        cursor.execute('SELECT * FROM customers ORDER BY name')
    
    customers = cursor.fetchall()
    conn.close()
    
    return render_template('customers.html', 
                         customers=customers,
                         search=search,
                         active_tab='customers')

@app.route('/customers/add', methods=['GET', 'POST'])
@login_required
def add_customer():
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        phone = request.form.get('phone', '').strip()
        address = request.form.get('address', '').strip()
        place = request.form.get('place', '').strip()
        pincode = request.form.get('pincode', '').strip()
        gstin = request.form.get('gstin', '').strip()
        customer_type = request.form.get('customer_type', 'B2C')
        
        if not name:
            flash('Customer name is required.', 'error')
            return render_template('customer_form.html', active_tab='customers')
        
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO customers (name, phone, address, place, pincode, gstin, customer_type)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (name, phone, address, place, pincode, gstin, customer_type))
        conn.commit()
        customer_id = cursor.lastrowid
        conn.close()
        
        log_audit('CUSTOMER_ADDED', {'customer_id': customer_id, 'name': name})
        flash(f'Customer "{name}" added successfully!', 'success')
        return redirect(url_for('customers'))
    
    return render_template('customer_form.html', customer=None, active_tab='customers')

@app.route('/customers/<int:id>/edit', methods=['GET', 'POST'])
@login_required
def edit_customer(id):
    conn = get_db()
    cursor = conn.cursor()
    
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        phone = request.form.get('phone', '').strip()
        address = request.form.get('address', '').strip()
        place = request.form.get('place', '').strip()
        pincode = request.form.get('pincode', '').strip()
        gstin = request.form.get('gstin', '').strip()
        customer_type = request.form.get('customer_type', 'B2C')
        
        cursor.execute('''
            UPDATE customers SET name=?, phone=?, address=?, place=?, pincode=?, gstin=?, customer_type=?
            WHERE id=?
        ''', (name, phone, address, place, pincode, gstin, customer_type, id))
        conn.commit()
        conn.close()
        
        log_audit('CUSTOMER_UPDATED', {'customer_id': id, 'name': name})
        flash(f'Customer "{name}" updated successfully!', 'success')
        return redirect(url_for('customers'))
    
    cursor.execute('SELECT * FROM customers WHERE id = ?', (id,))
    customer = cursor.fetchone()
    conn.close()
    
    if not customer:
        flash('Customer not found.', 'error')
        return redirect(url_for('customers'))
    
    return render_template('customer_form.html', customer=customer, active_tab='customers')

@app.route('/customers/<int:id>/delete', methods=['POST'])
@login_required
@admin_required
def delete_customer(id):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT name FROM customers WHERE id = ?', (id,))
    customer = cursor.fetchone()
    
    if customer:
        cursor.execute('DELETE FROM customers WHERE id = ?', (id,))
        conn.commit()
        log_audit('CUSTOMER_DELETED', {'customer_id': id, 'name': customer['name']})
        flash(f'Customer "{customer["name"]}" deleted.', 'success')
    
    conn.close()
    return redirect(url_for('customers'))

# ============================================================================
# INVOICES
# ============================================================================

@app.route('/invoices')
@login_required
def invoices():
    conn = get_db()
    cursor = conn.cursor()
    
    # Get filter parameters
    date_filter = request.args.get('date_filter', 'all')
    search = request.args.get('search', '')
    
    query = '''
        SELECT b.*, 
               (SELECT COUNT(*) FROM bill_items WHERE bill_id = b.id) as item_count
        FROM bills b WHERE 1=1
    '''
    params = []
    
    if search:
        query += ' AND (b.bill_number LIKE ? OR b.customer_name LIKE ?)'
        params.extend([f'%{search}%', f'%{search}%'])
    
    today = datetime.now().strftime('%Y-%m-%d')
    
    if date_filter == 'today':
        query += ' AND DATE(b.bill_date) = ?'
        params.append(today)
    elif date_filter == 'week':
        week_ago = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
        query += ' AND DATE(b.bill_date) >= ?'
        params.append(week_ago)
    elif date_filter == 'month':
        month_start = datetime.now().replace(day=1).strftime('%Y-%m-%d')
        query += ' AND DATE(b.bill_date) >= ?'
        params.append(month_start)
    
    query += ' ORDER BY b.bill_date DESC'
    
    cursor.execute(query, params)
    invoices = cursor.fetchall()
    conn.close()
    
    return render_template('invoices.html', 
                         invoices=invoices,
                         date_filter=date_filter,
                         search=search,
                         active_tab='invoices')

@app.route('/invoices/<int:id>')
@login_required
def view_invoice(id):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM bills WHERE id = ?', (id,))
    bill = cursor.fetchone()
    
    if not bill:
        flash('Invoice not found.', 'error')
        return redirect(url_for('invoices'))
    
    cursor.execute('SELECT * FROM bill_items WHERE bill_id = ?', (id,))
    items = cursor.fetchall()
    
    conn.close()
    
    return render_template('invoice_detail.html', 
                         bill=bill, 
                         items=items,
                         active_tab='invoices')

# ============================================================================
# ANALYTICS / REPORTS
# ============================================================================

@app.route('/analytics')
@login_required
def analytics():
    conn = get_db()
    cursor = conn.cursor()
    
    # Date range
    days = int(request.args.get('days', 30))
    start_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
    
    # Sales by day
    cursor.execute('''
        SELECT DATE(bill_date) as date, 
               COUNT(*) as count, 
               SUM(grand_total) as total,
               SUM(total_profit) as profit
        FROM bills 
        WHERE DATE(bill_date) >= ?
        GROUP BY DATE(bill_date)
        ORDER BY date
    ''', (start_date,))
    daily_sales = cursor.fetchall()
    
    # Top products
    cursor.execute('''
        SELECT p.name, SUM(bi.quantity) as sold, SUM(bi.line_subtotal) as revenue, SUM(bi.line_profit) as profit
        FROM bill_items bi
        JOIN products p ON bi.product_id = p.id
        JOIN bills b ON bi.bill_id = b.id
        WHERE DATE(b.bill_date) >= ?
        GROUP BY bi.product_id
        ORDER BY sold DESC LIMIT 10
    ''', (start_date,))
    top_products = cursor.fetchall()
    
    # Sales by payment mode
    cursor.execute('''
        SELECT payment_mode, COUNT(*) as count, SUM(grand_total) as total
        FROM bills
        WHERE DATE(bill_date) >= ?
        GROUP BY payment_mode
    ''', (start_date,))
    payment_breakdown = cursor.fetchall()
    
    # Category sales
    cursor.execute('''
        SELECT p.category, SUM(bi.quantity) as sold, SUM(bi.line_subtotal) as revenue
        FROM bill_items bi
        JOIN products p ON bi.product_id = p.id
        JOIN bills b ON bi.bill_id = b.id
        WHERE DATE(b.bill_date) >= ?
        GROUP BY p.category
        ORDER BY revenue DESC
    ''', (start_date,))
    category_sales = cursor.fetchall()
    
    conn.close()
    
    return render_template('analytics.html',
                         daily_sales=daily_sales,
                         top_products=top_products,
                         payment_breakdown=payment_breakdown,
                         category_sales=category_sales,
                         days=days,
                         active_tab='analytics')

@app.route('/reports')
@login_required
def reports():
    conn = get_db()
    cursor = conn.cursor()
    
    # Summary stats
    cursor.execute('SELECT COUNT(*) as total, SUM(quantity) as stock_value FROM products')
    product_summary = cursor.fetchone()
    
    cursor.execute('SELECT COUNT(*) FROM customers')
    customer_count = cursor.fetchone()[0]
    
    cursor.execute('''
        SELECT COUNT(*) as total_bills,
               SUM(grand_total) as total_revenue,
               SUM(total_profit) as total_profit
        FROM bills
    ''')
    sales_summary = cursor.fetchone()
    
    # Inventory value
    cursor.execute('SELECT SUM(quantity * cost_price) as cost, SUM(quantity * price) as retail FROM products')
    inventory_value = cursor.fetchone()
    
    conn.close()
    
    return render_template('reports.html',
                         product_summary=product_summary,
                         customer_count=customer_count,
                         sales_summary=sales_summary,
                         inventory_value=inventory_value,
                         active_tab='reports')

# ============================================================================
# USER MANAGEMENT
# ============================================================================

@app.route('/users')
@login_required
@admin_required
def users():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users ORDER BY username')
    users = cursor.fetchall()
    conn.close()
    
    return render_template('users.html', users=users, active_tab='users')

@app.route('/users/<int:id>/toggle', methods=['POST'])
@login_required
@admin_required
def toggle_user(id):
    if id == current_user.id:
        flash('Cannot deactivate your own account.', 'error')
        return redirect(url_for('users'))
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('UPDATE users SET is_active = NOT is_active WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    
    flash('User status updated.', 'success')
    return redirect(url_for('users'))

@app.route('/users/<int:id>/role', methods=['POST'])
@login_required
@admin_required
def change_role(id):
    if id == current_user.id:
        flash('Cannot change your own role.', 'error')
        return redirect(url_for('users'))
    
    new_role = request.form.get('role', 'cashier')
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('UPDATE users SET role = ? WHERE id = ?', (new_role, id))
    conn.commit()
    conn.close()
    
    flash('User role updated.', 'success')
    return redirect(url_for('users'))

# ============================================================================
# AUDIT LOGS
# ============================================================================

@app.route('/audit')
@login_required
@admin_required
def audit():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100
    ''')
    logs = cursor.fetchall()
    conn.close()
    
    return render_template('audit.html', logs=logs, active_tab='audit')

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.route('/api/products')
@login_required
def api_products():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM products WHERE quantity > 0 ORDER BY name')
    products = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(products)

@app.route('/api/customers')
@login_required
def api_customers():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM customers ORDER BY name')
    customers = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(customers)

@app.route('/api/stats')
@login_required
def api_stats():
    conn = get_db()
    cursor = conn.cursor()
    
    today = datetime.now().strftime('%Y-%m-%d')
    
    cursor.execute('SELECT COUNT(*) FROM products')
    total_products = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM products WHERE quantity <= min_stock')
    low_stock = cursor.fetchone()[0]
    
    cursor.execute('SELECT COALESCE(SUM(grand_total), 0) FROM bills WHERE DATE(bill_date) = ?', (today,))
    today_sales = cursor.fetchone()[0]
    
    conn.close()
    
    return jsonify({
        'total_products': total_products,
        'low_stock': low_stock,
        'today_sales': today_sales
    })

# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.errorhandler(404)
def not_found(e):
    return render_template('error.html', error='Page not found', code=404), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('error.html', error='Internal server error', code=500), 500

# ============================================================================
# RUN APP
# ============================================================================

if __name__ == '__main__':
    # Initialize database
    init_db()
    add_sample_data()
    
    # Run development server
    app.run(debug=True, host='0.0.0.0', port=5000)
