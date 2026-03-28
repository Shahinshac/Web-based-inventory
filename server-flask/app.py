from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_mail import Mail
from database import connect_db
from routes.auth import auth_bp
from routes.products import products_bp
from routes.customers import customers_bp
from routes.pos import pos_bp
from routes.expenses import expenses_bp
from routes.analytics import analytics_bp
from routes.admin import admin_bp
from routes.returns import returns_bp
from routes.public_invoice import public_invoice_bp
from routes.public_customer_card import public_customer_card_bp
from routes.public import public_bp
from routes.customer_portal import customer_portal_bp
from routes.payment_links import payment_links_bp
from services.cloudinary_service import init_cloudinary
import logging

from config import Config

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Initialize Flask App
app = Flask(__name__)
app.url_map.strict_slashes = False
app.config.from_object(Config)

# Enable CORS (Allows the React frontend to communicate with Flask)
CORS(app, resources={r"/api/*": {"origins": "*"}, r"/public/*": {"origins": "*"}})

# Connect to Database globally
connect_db(app)

# Initialize 3rd Party Wrappers
init_cloudinary(app)
Mail(app)  # Initialize Flask-Mail

# Register Blueprints
app.register_blueprint(auth_bp, url_prefix='/api/users')
app.register_blueprint(products_bp, url_prefix='/api/products')
app.register_blueprint(customers_bp, url_prefix='/api/customers')
app.register_blueprint(pos_bp, url_prefix='/api/checkout')
app.register_blueprint(expenses_bp, url_prefix='/api/expenses')
app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
app.register_blueprint(admin_bp, url_prefix='/api/admin')
app.register_blueprint(returns_bp, url_prefix='/api/returns')
app.register_blueprint(pos_bp, name='invoices', url_prefix='/api/invoices')
app.register_blueprint(customer_portal_bp, url_prefix='/api/customer')
app.register_blueprint(payment_links_bp, url_prefix='/api/payment-links')
# Public invoice viewing (no authentication required)
app.register_blueprint(public_invoice_bp, url_prefix='/public/invoice')
# Public customer card viewing (no authentication required)
app.register_blueprint(public_customer_card_bp, url_prefix='/public/customer-card')
# Public unified blueprint (includes customer vCard)
app.register_blueprint(public_bp, url_prefix='/public')

# The Express routes were: 
# app.use('/api/checkout', checkoutRoutes);
# wait, checkout.js had both /api/checkout and GET /api/invoices logic.
# If pos_bp handles GET /, we should register it as /api/invoices as well OR split it.
# Actually, wait. It's fine to register it twice if needed, but pos_bp has @pos_bp.route('/', methods=['POST']) which is checkout, and GET '/' which is get invoices.
# If I register pos_bp under /api/checkout, then GET /api/checkout/ gets invoices. Let's see how React calls it.

# Wait, the legacy app used /api/invoices for getting invoices and /api/checkout for POSTing. In pos.py, I used `/` for both. I should route them properly.


# Base Route
@app.route('/', methods=['GET'])
def index():
    return jsonify({
        "status": "online",
        "message": "Welcome to the 26:07 Electronics Python Flask API",
        "version": "1.0.0"
    })

# Health Check Route
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"api": "healthy"}), 200

if __name__ == '__main__':
    logger.info(f"🚀 Starting Flask Server on port {app.config['PORT']}...")
    app.run(host='0.0.0.0', port=app.config['PORT'], debug=app.config['DEBUG'])
