"""
Payment Links Routes
Handles UPI payment link generation and tracking
"""

import logging
import qrcode
import io
import base64
from datetime import datetime, timedelta
from bson import ObjectId
from flask import Blueprint, request, jsonify, current_app, g

from database import get_db
from utils.auth_middleware import authenticate_token, require_admin

logger = logging.getLogger(__name__)

payment_links_bp = Blueprint('payment_links', __name__)

# ==================== CONSTANTS ====================

PAYMENT_LINK_EXPIRY_DAYS = 30

# ==================== HELPERS ====================

def generate_upi_string(upi, name, amount, transaction_id):
    """Generate UPI payment string"""
    # Format: upi://pay?pa=<upi>&pn=<name>&am=<amount>&tn=<description>&tr=<transactionId>
    # URL encode the name and description
    import urllib.parse

    description = f"Invoice {transaction_id}"

    upi_string = (
        f"upi://pay?"
        f"pa={upi}&"
        f"pn={urllib.parse.quote(name)}&"
        f"am={amount}&"
        f"tn={urllib.parse.quote(description)}&"
        f"tr={transaction_id}"
    )

    return upi_string

def generate_qr_code(upi_string):
    """Generate QR code from UPI string and return as base64"""
    try:
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=2
        )
        qr.add_data(upi_string)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")

        # Convert to base64
        img_io = io.BytesIO()
        img.save(img_io, 'PNG')
        img_io.seek(0)
        qr_base64 = base64.b64encode(img_io.getvalue()).decode()

        return f"data:image/png;base64,{qr_base64}"
    except Exception as e:
        logger.error(f"QR code generation error: {e}")
        return None

# ==================== CRUD ====================

@payment_links_bp.route('', methods=['POST'])
@authenticate_token
@require_admin
def create_payment_link():
    """Create a new payment link"""
    try:
        data = request.get_json() or {}

        # Validation
        amount = data.get('amount')
        customer_name = data.get('customerName', 'Customer')
        customer_phone = data.get('customerPhone')
        description = data.get('description', '')
        invoice_id = data.get('invoiceId')

        if not amount or amount <= 0:
            return jsonify({"error": "Valid amount is required"}), 400

        if not customer_phone:
            return jsonify({"error": "Customer phone is required"}), 400

        # Validate phone format (must be digits only)
        if not customer_phone.isdigit():
            return jsonify({"error": "Customer phone must contain only digits"}), 400

        db = get_db()

        # Create transaction ID
        transaction_id = f"PAY-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{customer_phone[-4:]}"

        # Get UPI config from Flask config (will use env variables or defaults)
        company_upi = current_app.config.get('COMPANY_UPI', '7594012761@super')
        company_name = current_app.config.get('COMPANY_NAME', '26:07 Electronics')

        # Generate UPI string
        upi_string = generate_upi_string(company_upi, company_name, amount, transaction_id)

        # Generate QR code
        qr_code = generate_qr_code(upi_string)
        if not qr_code:
            logger.error(f"Failed to generate QR code for UPI: {upi_string}")
            return jsonify({"error": "Failed to generate QR code"}), 500

        # Create payment link record
        expiry_date = datetime.utcnow() + timedelta(days=PAYMENT_LINK_EXPIRY_DAYS)

        payment_link = {
            "transactionId": transaction_id,
            "amount": float(amount),
            "customerName": customer_name,
            "customerPhone": customer_phone,
            "description": description,
            "invoiceId": ObjectId(invoice_id) if invoice_id else None,
            "upiString": upi_string,
            "qrCode": qr_code,
            "status": "pending",  # pending, paid, expired, cancelled
            "createdAt": datetime.utcnow(),
            "expiryDate": expiry_date,
            "paidAt": None,
            "paidAmount": None,
            "notes": ""
        }

        # Insert into database
        result = db.payment_links.insert_one(payment_link)
        payment_link_id = str(result.inserted_id)

        # Log audit
        from services.audit_service import log_audit
        log_audit(db, "PAYMENT_LINK_CREATED", g.user.get('userId'), g.user.get('username'), {
            "paymentLinkId": payment_link_id,
            "amount": amount,
            "customerPhone": customer_phone
        })

        return jsonify({
            "success": True,
            "message": "Payment link created successfully",
            "paymentLink": {
                "id": payment_link_id,
                "transactionId": transaction_id,
                "amount": amount,
                "upiString": upi_string,
                "qrCode": qr_code,
                "expiryDate": expiry_date.isoformat(),
                "status": "pending"
            }
        }), 201

    except ValueError as ve:
        logger.error(f"Payment link validation error: {ve}")
        return jsonify({"error": f"Invalid data: {str(ve)}"}), 400
    except Exception as e:
        logger.error(f"Payment link creation error: {e}", exc_info=True)
        return jsonify({"error": f"Failed to create payment link: {str(e)}"}), 500

@payment_links_bp.route('', methods=['GET'])
@authenticate_token
@require_admin
def list_payment_links():
    """List all payment links with pagination"""
    try:
        db = get_db()

        # Pagination
        page = max(1, int(request.args.get('page', 1)))
        limit = min(int(request.args.get('limit', 20)), 100)
        skip = (page - 1) * limit

        # Filters
        status = request.args.get('status')
        customer_phone = request.args.get('customerPhone')

        # Build query
        query = {}
        if status:
            query['status'] = status
        if customer_phone:
            query['customerPhone'] = customer_phone

        # Fetch payment links
        links_cursor = db.payment_links.find(query).sort("createdAt", -1).skip(skip).limit(limit)
        total = db.payment_links.count_documents(query)

        links = []
        for link in links_cursor:
            links.append({
                "id": str(link['_id']),
                "transactionId": link.get('transactionId'),
                "amount": link.get('amount'),
                "customerName": link.get('customerName'),
                "customerPhone": link.get('customerPhone'),
                "status": link.get('status'),
                "createdAt": link.get('createdAt').isoformat() if link.get('createdAt') else None,
                "expiryDate": link.get('expiryDate').isoformat() if link.get('expiryDate') else None,
                "paidAt": link.get('paidAt').isoformat() if link.get('paidAt') else None
            })

        response = jsonify({
            "paymentLinks": links,
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
        logger.error(f"Payment links list error: {e}")
        return jsonify({"error": "Failed to fetch payment links"}), 500

@payment_links_bp.route('/<payment_link_id>', methods=['GET'])
@authenticate_token
def get_payment_link(payment_link_id):
    """Get a specific payment link"""
    try:
        db = get_db()
        link = db.payment_links.find_one({"_id": ObjectId(payment_link_id)})

        if not link:
            return jsonify({"error": "Payment link not found"}), 404

        return jsonify({
            "id": str(link['_id']),
            "transactionId": link.get('transactionId'),
            "amount": link.get('amount'),
            "customerName": link.get('customerName'),
            "customerPhone": link.get('customerPhone'),
            "description": link.get('description'),
            "upiString": link.get('upiString'),
            "qrCode": link.get('qrCode'),
            "status": link.get('status'),
            "createdAt": link.get('createdAt').isoformat() if link.get('createdAt') else None,
            "expiryDate": link.get('expiryDate').isoformat() if link.get('expiryDate') else None,
            "paidAt": link.get('paidAt').isoformat() if link.get('paidAt') else None,
            "paidAmount": link.get('paidAmount'),
            "notes": link.get('notes')
        })

    except Exception as e:
        logger.error(f"Get payment link error: {e}")
        return jsonify({"error": "Failed to fetch payment link"}), 500

@payment_links_bp.route('/<payment_link_id>', methods=['PATCH'])
@authenticate_token
@require_admin
def update_payment_link(payment_link_id):
    """Update payment link status"""
    try:
        db = get_db()
        link = db.payment_links.find_one({"_id": ObjectId(payment_link_id)})

        if not link:
            return jsonify({"error": "Payment link not found"}), 404

        data = request.get_json() or {}
        status = data.get('status')
        notes = data.get('notes')

        # Validate status
        valid_statuses = ['pending', 'paid', 'expired', 'cancelled']
        if status and status not in valid_statuses:
            return jsonify({"error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"}), 400

        update_data = {}
        if status:
            update_data['status'] = status
            # If marked as paid, set paid timestamp
            if status == 'paid':
                update_data['paidAt'] = datetime.utcnow()
                update_data['paidAmount'] = link.get('amount')

        if notes is not None:
            update_data['notes'] = notes

        if not update_data:
            return jsonify({"error": "No valid fields to update"}), 400

        db.payment_links.update_one({"_id": ObjectId(payment_link_id)}, {"$set": update_data})

        # Log audit
        from services.audit_service import log_audit
        log_audit(db, "PAYMENT_LINK_UPDATED", g.user.get('userId'), g.user.get('username'), {
            "paymentLinkId": payment_link_id,
            "status": status
        })

        return jsonify({
            "success": True,
            "message": "Payment link updated successfully"
        })

    except Exception as e:
        logger.error(f"Payment link update error: {e}")
        return jsonify({"error": "Failed to update payment link"}), 500

@payment_links_bp.route('/<payment_link_id>', methods=['DELETE'])
@authenticate_token
@require_admin
def delete_payment_link(payment_link_id):
    """Delete a payment link"""
    try:
        db = get_db()
        link = db.payment_links.find_one({"_id": ObjectId(payment_link_id)})

        if not link:
            return jsonify({"error": "Payment link not found"}), 404

        db.payment_links.delete_one({"_id": ObjectId(payment_link_id)})

        # Log audit
        from services.audit_service import log_audit
        log_audit(db, "PAYMENT_LINK_DELETED", g.user.get('userId'), g.user.get('username'), {
            "paymentLinkId": payment_link_id,
            "transactionId": link.get('transactionId')
        })

        return jsonify({
            "success": True,
            "message": "Payment link deleted successfully"
        })

    except Exception as e:
        logger.error(f"Payment link deletion error: {e}")
        return jsonify({"error": "Failed to delete payment link"}), 500

# ==================== AUTO-EXPIRY ====================

@payment_links_bp.route('/cleanup/expired', methods=['POST'])
def cleanup_expired_links():
    """Mark expired payment links as expired (can be called by scheduler)"""
    try:
        db = get_db()

        # Find and update expired links
        result = db.payment_links.update_many(
            {
                "expiryDate": {"$lt": datetime.utcnow()},
                "status": {"$in": ["pending"]}
            },
            {
                "$set": {"status": "expired"}
            }
        )

        return jsonify({
            "success": True,
            "message": f"Marked {result.modified_count} payment links as expired"
        })

    except Exception as e:
        logger.error(f"Cleanup expired links error: {e}")
        return jsonify({"error": "Failed to cleanup expired links"}), 500
