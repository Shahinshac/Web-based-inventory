"""
Customer Authentication Routes (Password-Based)
Mounted at /api/customer-auth to avoid URL conflicts with the
staff auth blueprint which uses dynamic /<id> routes.

Endpoints:
  POST /api/customer-auth/register         - create account (billing email required)
  POST /api/customer-auth/login            - login with email + password → JWT
  POST /api/customer-auth/change-password  - change password (supply current password)
"""

import bcrypt
import logging
import jwt
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from bson import ObjectId

from database import get_db
from services.audit_service import log_audit
from utils.tzutils import utc_now, to_iso_string
from utils.auth_middleware import authenticate_token, require_admin

logger = logging.getLogger(__name__)

customer_auth_v2_bp = Blueprint('customer_auth_v2', __name__)


@customer_auth_v2_bp.route('/check-active', methods=['GET'])
def check_active():
    return jsonify({"status": "active", "blueprint": "customer_auth_v2"}), 200


# ── REGISTER ─────────────────────────────────────────────────────────────────

@customer_auth_v2_bp.route('/register', methods=['POST'])
def customer_register():
    """Register a customer account with email + password.
    Only emails that already exist in the customers collection can register."""
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or '@' not in email:
        return jsonify({"error": "Valid email address is required"}), 400
    if not password or len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    try:
        db = get_db()

        # Only billed customers (emails in the customers DB) can register
        customer = db.customers.find_one(
            {"email": {"$regex": f"^{email}$", "$options": "i"}}
        )
        if not customer:
            return jsonify({
                "error": "This email is not registered in our system. Please use the email you provided during billing."
            }), 404

        # Prevent duplicate accounts
        if customer.get('accountPassword'):
            return jsonify({"error": "An account already exists for this email. Please login instead."}), 400

        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        db.customers.update_one(
            {"_id": customer['_id']},
            {"$set": {"accountPassword": hashed, "sessionVersion": 1}}
        )

        log_audit(db, "CUSTOMER_ACCOUNT_CREATED", str(customer['_id']), customer.get('name'), {
            "email": email
        })

        return jsonify({
            "success": True,
            "message": "Account created successfully! You can now login."
        }), 201

    except Exception as e:
        logger.error(f"Error in customer_register: {e}", exc_info=True)
        return jsonify({"error": "Registration failed. Please try again."}), 500


# ── LOGIN ─────────────────────────────────────────────────────────────────────

@customer_auth_v2_bp.route('/login', methods=['POST'])
def customer_login():
    """Login a customer with email + password. Returns a JWT token."""
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    try:
        db = get_db()

        customer = db.customers.find_one(
            {"email": {"$regex": f"^{email}$", "$options": "i"}}
        )

        if not customer:
            return jsonify({"error": "Invalid email or password"}), 401

        if not customer.get('accountPassword'):
            return jsonify({
                "error": "No account registered for this email. Please register first.",
                "needs_registration": True
            }), 401

        if not bcrypt.checkpw(password.encode('utf-8'), customer['accountPassword'].encode('utf-8')):
            return jsonify({"error": "Invalid email or password"}), 401

        # Update last login timestamp
        db.customers.update_one({"_id": customer['_id']}, {"$set": {"lastLogin": utc_now()}})

        # Issue JWT
        session_version = customer.get('sessionVersion', 1)
        token_payload = {
            "userId": str(customer['_id']),
            "email": customer.get('email'),
            "name": customer.get('name'),
            "role": 'customer',
            "sessionVersion": session_version,
            "exp": utc_now() + timedelta(days=7)
        }
        token = jwt.encode(token_payload, current_app.config['SECRET_KEY'], algorithm='HS256')

        ip_addr = request.headers.get('X-Forwarded-For', request.remote_addr)
        log_audit(db, "CUSTOMER_LOGIN", str(customer['_id']), customer.get('name'), {"ip": ip_addr})

        return jsonify({
            "success": True,
            "token": token,
            "customer": {
                "id": str(customer['_id']),
                "email": customer.get('email'),
                "name": customer.get('name'),
                "phone": customer.get('phone'),
                "role": 'customer'
            }
        })

    except Exception as e:
        logger.error(f"Error in customer_login: {e}", exc_info=True)
        return jsonify({"error": "Login failed. Please try again."}), 500


# ── CHANGE PASSWORD ───────────────────────────────────────────────────────────

@customer_auth_v2_bp.route('/change-password', methods=['POST'])
def customer_change_password():
    """Allow a customer to change their password (must supply current password)."""
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    current_password = data.get('currentPassword', '')
    new_password = data.get('newPassword', '')

    if not email or not current_password or not new_password:
        return jsonify({"error": "Email, current password and new password are required"}), 400
    if len(new_password) < 6:
        return jsonify({"error": "New password must be at least 6 characters"}), 400

    try:
        db = get_db()
        customer = db.customers.find_one(
            {"email": {"$regex": f"^{email}$", "$options": "i"}}
        )
        if not customer or not customer.get('accountPassword'):
            return jsonify({"error": "Account not found"}), 404

        if not bcrypt.checkpw(current_password.encode('utf-8'), customer['accountPassword'].encode('utf-8')):
            return jsonify({"error": "Current password is incorrect"}), 401

        hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        db.customers.update_one(
            {"_id": customer['_id']},
            {"$set": {"accountPassword": hashed}, "$inc": {"sessionVersion": 1}}
        )

        return jsonify({"success": True, "message": "Password changed successfully"})

    except Exception as e:
        logger.error(f"Error changing customer password: {e}", exc_info=True)
        return jsonify({"error": "Failed to change password"}), 500


# ── ADMIN CUSTOMER MANAGEMENT ───────────────────────────────────────────────

@customer_auth_v2_bp.route('/admin/list', methods=['GET'])
@authenticate_token
@require_admin
def admin_list_customers():
    """List all customers with their login status (Admin only)."""
    try:
        db = get_db()
        # Find all customers that have an email
        customers = list(db.customers.find({"email": {"$exists": True, "$ne": ""}}))
        
        result = []
        for c in customers:
            last_login = c.get('lastLogin')
            # Ensure last_login is either datetime or string or None
            last_login_str = None
            if last_login:
                try:
                    last_login_str = to_iso_string(last_login)
                except Exception:
                    last_login_str = str(last_login)
            
            result.append({
                "id": str(c['_id']),
                "name": c.get('name', 'N/A'),
                "email": c.get('email'),
                "phone": c.get('phone', 'N/A'),
                "hasAccount": bool(c.get('accountPassword')),
                "lastLogin": last_login_str
            })
            
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error listing customer accounts: {str(e)}", exc_info=True)
        return jsonify({"error": f"Failed to list customers: {str(e)}"}), 500


@customer_auth_v2_bp.route('/admin/reset-password', methods=['POST'])
@authenticate_token
@require_admin
def admin_reset_customer_password():
    """Force reset a customer's password (Admin only)."""
    data = request.get_json() or {}
    customer_id = data.get('customerId')
    new_password = data.get('newPassword')

    if not customer_id or not new_password:
        return jsonify({"error": "Customer ID and new password are required"}), 400
    if len(new_password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    try:
        db = get_db()
        hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        res = db.customers.update_one(
            {"_id": ObjectId(customer_id)},
            {"$set": {"accountPassword": hashed}, "$inc": {"sessionVersion": 1}}
        )

        if res.matched_count == 0:
            return jsonify({"error": "Customer not found"}), 404

        return jsonify({"success": True, "message": "Customer password reset successfully"})
    except Exception as e:
        logger.error(f"Error resetting customer password: {e}")
        return jsonify({"error": "Failed to reset password"}), 500


@customer_auth_v2_bp.route('/admin/delete-account', methods=['POST'])
@authenticate_token
@require_admin
def admin_delete_customer_account():
    """Remove login capability for a customer (Admin only)."""
    data = request.get_json() or {}
    customer_id = data.get('customerId')

    if not customer_id:
        return jsonify({"error": "Customer ID is required"}), 400

    try:
        db = get_db()
        res = db.customers.update_one(
            {"_id": ObjectId(customer_id)},
            {"$unset": {"accountPassword": ""}, "$inc": {"sessionVersion": 1}}
        )

        if res.matched_count == 0:
            return jsonify({"error": "Customer not found"}), 404

        return jsonify({"success": True, "message": "Customer login access removed"})
    except Exception as e:
        logger.error(f"Error deleting customer account: {e}")
        return jsonify({"error": "Failed to remove account"}), 500
