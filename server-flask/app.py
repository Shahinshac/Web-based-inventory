from flask import Flask, jsonify, request
from flask_cors import CORS
from database import connect_db
from routes.auth import auth_bp
from routes.customer_auth import customer_auth_v2_bp
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
from routes.emi import emi_bp
from routes.exports import exports_bp
from routes.employees import employees_bp
from routes.salary import salary_bp
from services.cloudinary_service import init_cloudinary
from routes.emi import sync_all_emi_statuses
import logging
import os
import re
from datetime import datetime
import threading
import time

from config import Config

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Initialize Flask App
app = Flask(__name__)
app.url_map.strict_slashes = False
app.config.from_object(Config)

# Build allowed CORS origins list
# CORS_ORIGIN env var can supply one or more comma-separated extra origins
_extra_origins = [o.strip() for o in os.environ.get('CORS_ORIGIN', '').split(',') if o.strip()]

_cors_origins = [
    "https://26-07inventory.vercel.app",          # Primary production Vercel frontend
    re.compile(r"^https://.*\.vercel\.app$"),      # All Vercel preview deployments
    re.compile(r"^http://localhost:\d+$"),         # Local development (any port)
    re.compile(r"^http://127\.0\.0\.1:\d+$"),
    re.compile(r"^https?://192\.168\.\d+\.\d+:\d+$"),  # Local network (mobile testing)
    re.compile(r"^https?://10\.\d+\.\d+\.\d+:\d+$"),
] + _extra_origins

# Enable CORS (Allows the React frontend to communicate with Flask)
CORS(app,
     origins=_cors_origins,
     allow_headers=["Content-Type", "Authorization"],
     supports_credentials=True
)

# Connect to Database globally
app.db = connect_db(app)

# Initialize 3rd Party Wrappers
init_cloudinary(app)


def _start_emi_status_sync_worker():
    if os.environ.get('EMI_AUTO_SYNC_ENABLED', 'true').lower() != 'true':
        logger.info('[emi-sync] Automatic EMI sync disabled by environment flag')
        return

    interval_seconds = int(os.environ.get('EMI_AUTO_SYNC_INTERVAL_SECONDS', '3600'))

    def _worker():
        while True:
            try:
                with app.app_context():
                    result = sync_all_emi_statuses(app.db)
                    if result.get('updatedPlans', 0) > 0:
                        logger.info(
                            f"[emi-sync] Updated {result['updatedPlans']} EMI plans and {result['updatedInstallments']} installments"
                        )
            except Exception as sync_error:
                logger.error(f"[emi-sync] Error syncing EMI statuses: {sync_error}", exc_info=True)

            time.sleep(interval_seconds)

    thread = threading.Thread(target=_worker, name='emi-status-sync', daemon=True)
    thread.start()
    logger.info(f'[emi-sync] Background EMI sync worker started (interval: {interval_seconds}s)')

# Register Blueprints
app.register_blueprint(auth_bp, url_prefix='/api/users')
app.register_blueprint(customer_auth_v2_bp, url_prefix='/api/customer-auth')
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
app.register_blueprint(emi_bp, url_prefix='/api/emi')
app.register_blueprint(exports_bp, url_prefix='/api/exports')
app.register_blueprint(employees_bp, url_prefix='/api/employees')
app.register_blueprint(salary_bp, url_prefix='/api/salary')
# Public invoice viewing (no authentication required)
app.register_blueprint(public_invoice_bp, url_prefix='/public/invoice')
# Public customer card viewing (no authentication required)
app.register_blueprint(public_customer_card_bp, url_prefix='/public/customer-card')
# Public unified blueprint (includes customer vCard)
app.register_blueprint(public_bp, url_prefix='/public')

_start_emi_status_sync_worker()

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
@app.route('/health', methods=['GET', 'HEAD', 'OPTIONS'])
def health_check():
    return jsonify({"api": "healthy"}), 200

# Detailed Health/Diagnostics Route (for debugging frontend issues)
@app.route('/health/details', methods=['GET'])
def health_details():
    """
    Comprehensive health check with database diagnostics.
    Helps frontend diagnose why customer purchase fetch fails even when API health is OK.
    """
    try:
        db = app.db  # Get global database connection

        diagnostics = {
            "api": "healthy",
            "timestamp": datetime.now().isoformat(),
            "database": {
                "status": "checking...",
                "collections": {},
                "sample_customer": None
            },
            "debug_info": None
        }

        # Try to connect and query database
        try:
            logger.info("[health/details] 🔍 Checking database connectivity...")

            # Test database by checking if customers collection exists and is accessible
            customers_count = db.customers.count_documents({})
            diagnostics["database"]["status"] = "connected"
            diagnostics["database"]["collections"]["customers"] = {
                "count": customers_count,
                "status": "accessible"
            }
            logger.info(f"[health/details] ✅ Customers collection: {customers_count} documents")

            # Count bills
            bills_count = db.bills.count_documents({})
            diagnostics["database"]["collections"]["bills"] = {
                "count": bills_count,
                "status": "accessible"
            }
            logger.info(f"[health/details] ✅ Bills collection: {bills_count} documents")

            # Count warranties
            warranties_count = db.warranties.count_documents({})
            diagnostics["database"]["collections"]["warranties"] = {
                "count": warranties_count,
                "status": "accessible"
            }
            logger.info(f"[health/details] ✅ Warranties collection: {warranties_count} documents")

            # Try to find customer SHAHINSHA (for debugging the specific issue)
            try:
                from bson import ObjectId
                shahinsha_regex = {"$regex": "^shahinsha$", "$options": "i"}
                shahinsha = db.customers.find_one({"name": shahinsha_regex})

                if shahinsha:
                    diagnostics["database"]["sample_customer"] = {
                        "name": shahinsha.get('name'),
                        "id": str(shahinsha['_id']),
                        "phone": shahinsha.get('phone', 'N/A'),
                        "email": shahinsha.get('email', 'N/A'),
                        "bills_count": db.bills.count_documents({
                            "$or": [
                                {"customerId": ObjectId(shahinsha['_id'])},
                                {"customerId": str(shahinsha['_id'])},
                                {"customerPhone": shahinsha.get('phone', '')},
                                {"customerName": shahinsha.get('name', '')}
                            ]
                        })
                    }
                    logger.info(f"[health/details] ✅ Found SHAHINSHA customer: {diagnostics['database']['sample_customer']}")
                else:
                    diagnostics["database"]["sample_customer"] = {"status": "not found", "query": "name regex ^shahinsha$"}
                    logger.warning("[health/details] ⚠️  Customer SHAHINSHA not found in database")
            except Exception as find_err:
                diagnostics["database"]["sample_customer"] = {"status": "error", "error": str(find_err)}
                logger.error(f"[health/details] ❌ Error finding SHAHINSHA: {find_err}")

        except Exception as db_err:
            diagnostics["database"]["status"] = "error"
            diagnostics["database"]["error"] = str(db_err)
            logger.error(f"[health/details] ❌ Database error: {db_err}", exc_info=True)

        # Add debug info if enabled
        if app.config.get('DEBUG'):
            diagnostics["debug_info"] = {
                "flask_env": app.config.get('ENV'),
                "database_url": "***hidden***",  # Don't expose real URL for security
                "cors_enabled": True
            }

        logger.info(f"[health/details] 📊 Diagnostics complete: {diagnostics}")
        return jsonify(diagnostics), 200

    except Exception as e:
        logger.error(f"[health/details] ❌ Unexpected error in health/details: {str(e)}", exc_info=True)
        return jsonify({
            "api": "unhealthy",
            "error": "Health check failed",
            "message": str(e) if app.config.get('DEBUG') else "An error occurred during health check"
        }), 500

# Global Error Handler - catch all unhandled exceptions
@app.errorhandler(Exception)
def handle_error(error):
    """Catch all unhandled exceptions and return proper JSON error response"""
    logger.error(f"[ERROR] Unhandled exception: {str(error)}", exc_info=True)

    # Return JSON error response instead of HTML error page
    return jsonify({
        "error": "Internal server error",
        "message": str(error) if app.config.get('DEBUG') else "An unexpected error occurred"
    }), 500

# 404 Error Handler
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "error": "Not found",
        "message": "The requested resource does not exist"
    }), 404

# 405 Method Not Allowed
@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({
        "error": "Method not allowed",
        "message": f"The {request.method} method is not allowed for this endpoint"
    }), 405

if __name__ == '__main__':
    logger.info(f"🚀 Starting Flask Server on port {app.config['PORT']}...")
    app.run(host='0.0.0.0', port=app.config['PORT'], debug=app.config['DEBUG'])
