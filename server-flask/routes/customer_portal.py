"""
Customer Portal Routes
Handles customer-specific data endpoints like dashboard, invoices, warranties
"""

import logging
import jwt
from datetime import datetime, timedelta
from bson import ObjectId
from flask import Blueprint, request, jsonify, current_app, g

from database import get_db
from utils.auth_middleware import authenticate_token

logger = logging.getLogger(__name__)

customer_portal_bp = Blueprint('customer_portal', __name__)

# ==================== MIDDLEWARE ====================

def get_current_customer():
    """Get current customer from JWT token"""
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return None

        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        db = get_db()
        customer = db.customers.find_one({"email": payload.get('email')})
        return customer
    except Exception as e:
        logger.error(f"Error getting customer: {e}")
        return None

# ==================== DASHBOARD ====================

@customer_portal_bp.route('/dashboard', methods=['GET'])
@authenticate_token
def get_dashboard():
    """Get customer dashboard statistics"""
    try:
        customer = get_current_customer()
        if not customer:
            return jsonify({"error": "Customer not found"}), 404

        db = get_db()
        customer_id = customer['_id']

        # Get invoices for this customer
        invoices = list(db.bills.find({"customerId": customer_id}))

        # Calculate stats
        total_purchases = len(invoices)
        total_spent = sum(float(inv.get('grandTotal', 0)) for inv in invoices)

        # Get latest purchases
        recent_invoices = sorted(invoices, key=lambda x: x.get('billDate', datetime.utcnow()), reverse=True)[:5]

        # Get warranties
        warranties = list(db.warranties.find({"customerId": customer_id}))
        active_warranties = len([w for w in warranties if w.get('status') == 'active'])
        expired_warranties = len([w for w in warranties if w.get('status') == 'expired'])

        return jsonify({
            "memberSince": customer.get('createdAt').isoformat() if customer.get('createdAt') else None,
            "stats": {
                "totalPurchases": total_purchases,
                "totalSpent": round(total_spent, 2),
                "activeWarranties": active_warranties,
                "expiredWarranties": expired_warranties
            },
            "recentPurchases": [
                {
                    "id": str(inv['_id']),
                    "invoiceNo": inv.get('billNumber'),
                    "date": inv.get('billDate').isoformat() if inv.get('billDate') else None,
                    "total": float(inv.get('grandTotal', 0)),
                    "itemCount": len(inv.get('items', []))
                }
                for inv in recent_invoices
            ]
        })

    except Exception as e:
        logger.error(f"Dashboard error: {e}")
        return jsonify({"error": "Failed to fetch dashboard"}), 500

# ==================== INVOICES ====================

@customer_portal_bp.route('/invoices', methods=['GET'])
@authenticate_token
def get_customer_invoices():
    """Get all invoices for current customer"""
    try:
        customer = get_current_customer()
        if not customer:
            return jsonify({"error": "Customer not found"}), 404

        db = get_db()
        customer_id = customer['_id']

        # Pagination
        page = max(1, int(request.args.get('page', 1)))
        limit = min(int(request.args.get('limit', 20)), 100)
        skip = (page - 1) * limit

        # Fetch invoices
        invoices_cursor = db.bills.find({"customerId": customer_id}).sort("billDate", -1).skip(skip).limit(limit)
        total = db.bills.count_documents({"customerId": customer_id})

        invoices = []
        for inv in invoices_cursor:
            invoices.append({
                "id": str(inv['_id']),
                "invoiceNo": inv.get('billNumber'),
                "date": inv.get('billDate').isoformat() if inv.get('billDate') else None,
                "total": float(inv.get('grandTotal', 0)),
                "paymentMethod": inv.get('paymentMode', 'cash'),
                "items": inv.get('items', []),
                "itemCount": len(inv.get('items', []))
            })

        response = jsonify({
            "invoices": invoices,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        })
        response.headers['X-Total-Count'] = str(total)
        return response

    except Exception as e:
        logger.error(f"Invoices error: {e}")
        return jsonify({"error": "Failed to fetch invoices"}), 500

@customer_portal_bp.route('/invoices/<invoice_id>/pdf', methods=['GET'])
@authenticate_token
def download_invoice_pdf(invoice_id):
    """Download invoice as PDF"""
    try:
        customer = get_current_customer()
        if not customer:
            return jsonify({"error": "Customer not found"}), 404

        db = get_db()
        invoice = db.bills.find_one({"_id": ObjectId(invoice_id), "customerId": customer['_id']})

        if not invoice:
            return jsonify({"error": "Invoice not found"}), 404

        # For now, return invoice data - PDF generation can be added later
        # This would require reportlab or weasyprint library
        return jsonify({
            "message": "PDF generation coming soon",
            "invoiceNo": invoice.get('billNumber'),
            "total": invoice.get('grandTotal')
        }), 501

    except Exception as e:
        logger.error(f"PDF download error: {e}")
        return jsonify({"error": "Failed to download invoice"}), 500

# ==================== WARRANTIES ====================

@customer_portal_bp.route('/warranties', methods=['GET'])
@authenticate_token
def get_customer_warranties():
    """Get all warranties for current customer"""
    try:
        customer = get_current_customer()
        if not customer:
            return jsonify({"error": "Customer not found"}), 404

        db = get_db()
        customer_id = customer['_id']

        # Pagination
        page = max(1, int(request.args.get('page', 1)))
        limit = min(int(request.args.get('limit', 20)), 100)
        skip = (page - 1) * limit

        # Fetch warranties
        warranties_cursor = db.warranties.find({"customerId": customer_id}).sort("expiryDate", 1).skip(skip).limit(limit)
        total = db.warranties.count_documents({"customerId": customer_id})

        warranties = []
        for w in warranties_cursor:
            expiry_date = w.get('expiryDate')
            days_left = 0
            status = 'expired'

            if expiry_date:
                days_left = (expiry_date - datetime.utcnow()).days
                if days_left > 0:
                    status = 'active'
                    if days_left <= 30:
                        status = 'expiring_soon'

            warranties.append({
                "id": str(w['_id']),
                "productName": w.get('productName'),
                "productSku": w.get('productSku'),
                "warrantyType": w.get('warrantyType'),
                "startDate": w.get('startDate').isoformat() if w.get('startDate') else None,
                "expiryDate": expiry_date.isoformat() if expiry_date else None,
                "status": status,
                "daysLeft": max(0, days_left),
                "invoiceNumber": w.get('invoiceNo')
            })

        response = jsonify({
            "warranties": warranties,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        })
        response.headers['X-Total-Count'] = str(total)
        return response

    except Exception as e:
        logger.error(f"Warranties error: {e}")
        return jsonify({"error": "Failed to fetch warranties"}), 500

@customer_portal_bp.route('/warranties/<warranty_id>/renew', methods=['POST'])
@authenticate_token
def renew_warranty(warranty_id):
    """Renew a warranty"""
    try:
        customer = get_current_customer()
        if not customer:
            return jsonify({"error": "Customer not found"}), 404

        db = get_db()
        warranty = db.warranties.find_one({"_id": ObjectId(warranty_id), "customerId": customer['_id']})

        if not warranty:
            return jsonify({"error": "Warranty not found"}), 404

        data = request.get_json() or {}
        years = int(data.get('years', 1))

        # Calculate new expiry
        current_expiry = warranty.get('expiryDate', datetime.utcnow())
        new_expiry = current_expiry + timedelta(days=365 * years)

        # Update warranty
        db.warranties.update_one(
            {"_id": ObjectId(warranty_id)},
            {
                "$set": {
                    "expiryDate": new_expiry,
                    "renewalDate": datetime.utcnow(),
                    "status": "active"
                }
            }
        )

        return jsonify({
            "success": True,
            "message": "Warranty renewed successfully",
            "newExpiryDate": new_expiry.isoformat()
        })

    except Exception as e:
        logger.error(f"Warranty renewal error: {e}")
        return jsonify({"error": "Failed to renew warranty"}), 500

# ==================== PROFILE ====================

@customer_portal_bp.route('/profile', methods=['GET'])
@authenticate_token
def get_customer_profile():
    """Get customer profile"""
    try:
        customer = get_current_customer()
        if not customer:
            return jsonify({"error": "Customer not found"}), 404

        return jsonify({
            "id": str(customer['_id']),
            "name": customer.get('name'),
            "email": customer.get('email'),
            "phone": customer.get('phone'),
            "role": customer.get('role')
        })

    except Exception as e:
        logger.error(f"Profile error: {e}")
        return jsonify({"error": "Failed to fetch profile"}), 500

@customer_portal_bp.route('/profile', methods=['PATCH'])
@authenticate_token
def update_customer_profile():
    """Update customer profile"""
    try:
        customer = get_current_customer()
        if not customer:
            return jsonify({"error": "Customer not found"}), 404

        data = request.get_json() or {}

        # Allowed fields
        allowed_fields = ['name', 'phone']
        update_data = {k: v for k, v in data.items() if k in allowed_fields}

        if not update_data:
            return jsonify({"error": "No valid fields to update"}), 400

        db = get_db()
        db.customers.update_one(
            {"_id": customer['_id']},
            {"$set": update_data}
        )

        return jsonify({
            "success": True,
            "message": "Profile updated successfully"
        })

    except Exception as e:
        logger.error(f"Profile update error: {e}")
        return jsonify({"error": "Failed to update profile"}), 500

@customer_portal_bp.route('/change-password', methods=['POST'])
@authenticate_token
def change_customer_password():
    """Customer cannot change password (OTP-based auth only)"""
    return jsonify({
        "error": "Password changes not supported for OTP-based authentication",
        "message": "Contact support to change your email address"
    }), 400
