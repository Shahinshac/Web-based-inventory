"""
Customer Portal Routes
Handles customer-specific data endpoints like dashboard, invoices, warranties, EMI
"""

import logging
import jwt
from datetime import datetime, timedelta
from bson import ObjectId
from flask import Blueprint, request, jsonify, current_app, g, send_file
from database import get_db
from utils.auth_middleware import authenticate_token, require_customer
from utils.constants import COMPANY_NAME, COMPANY_PHONE
from services.customer_service import build_vcard, build_pvc_card_pdf
from utils.tzutils import utc_now, to_iso_string

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

def get_customer_match_query(customer):
    """Build a robust match query for a customer (ID, Name, Phone, Email)"""
    customer_id = customer['_id']
    or_conditions = [
        {"customerId": customer_id},
        {"customerId": str(customer_id)}
    ]

    if customer.get('name') and str(customer.get('name')).lower() != "walk-in customer":
        import re
        customer_name = str(customer.get('name')).strip()
        or_conditions.append({"customerName": customer_name})
        or_conditions.append({"customerName": re.compile(f"^{re.escape(customer_name)}$", re.I)})

    if customer.get('phone') and str(customer.get('phone')).strip() != "":
        customer_phone = str(customer.get('phone')).strip()
        or_conditions.append({"customerPhone": customer_phone})

        normalized_phone = ''.join(ch for ch in customer_phone if ch.isdigit())
        if normalized_phone:
            or_conditions.append({"customerPhone": normalized_phone})
            if normalized_phone.startswith('91') and len(normalized_phone) > 10:
                or_conditions.append({"customerPhone": normalized_phone[-10:]})

    if customer.get('email') and str(customer.get('email')).strip() != "":
        import re
        customer_email = str(customer.get('email')).strip()
        or_conditions.append({"customerEmail": customer_email})
        email_regex = re.compile(f"^{re.escape(customer_email)}$", re.I)
        or_conditions.append({"customerEmail": email_regex})
        
    return {"$or": or_conditions}

# ==================== DASHBOARD ====================

@customer_portal_bp.route('/dashboard', methods=['GET'])
@authenticate_token
def get_dashboard():
    """Get customer dashboard statistics"""
    try:
        db = get_db()
        customer = get_current_customer()
        if not customer:
            return jsonify({"error": "Customer not found"}), 404

        match_query = get_customer_match_query(customer)

        # Get invoices for this customer
        invoices = list(db.bills.find(match_query))

        # Calculate stats
        total_purchases = len(invoices)
        total_spent = sum(float(inv.get('grandTotal', 0)) for inv in invoices)

        # Get latest purchases
        recent_invoices = sorted(invoices, key=lambda x: x.get('billDate', utc_now()), reverse=True)[:5]

        # Get warranties
        warranties = list(db.warranties.find(match_query))
        active_warranties = len([w for w in warranties if w.get('status') == 'active'])
        expired_warranties = len([w for w in warranties if w.get('status') == 'expired'])

        return jsonify({
            "memberSince": customer.get('createdAt').isoformat() if customer.get('createdAt') and hasattr(customer.get('createdAt'), 'isoformat') else None,
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
                    "date": inv.get('billDate').isoformat() if inv.get('billDate') and hasattr(inv.get('billDate'), 'isoformat') else None,
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

        match_query = get_customer_match_query(customer)

        # Pagination
        page = max(1, int(request.args.get('page', 1)))
        limit = min(int(request.args.get('limit', 20)), 100)
        skip = (page - 1) * limit

        # Fetch invoices
        db = get_db()
        invoices_cursor = db.bills.find(match_query).sort("billDate", -1).skip(skip).limit(limit)
        total = db.bills.count_documents(match_query)

        invoices = []
        for inv in invoices_cursor:
            try:
                # Safely serialize items array
                items = []
                for item in inv.get('items', []):
                    items.append({
                        "productId": str(item.get('productId')) if item.get('productId') else None,
                        "productName": str(item.get('productName', 'Unknown')),
                        "quantity": float(item.get('quantity', 0)),
                        "unitPrice": float(item.get('unitPrice', 0)),
                        "lineSubtotal": float(item.get('lineSubtotal', 0)),
                        "lineGstAmount": float(item.get('lineGstAmount', 0))
                    })

                invoices.append({
                    "id": str(inv['_id']),
                    "invoiceNo": str(inv.get('billNumber', 'N/A')),
                    "date": inv.get('billDate').isoformat() if inv.get('billDate') and hasattr(inv.get('billDate'), 'isoformat') else None,
                    "total": float(inv.get('grandTotal', 0)),
                    "paymentMethod": str(inv.get('paymentMode', 'cash')),
                    "emiEnabled": bool(inv.get('emiEnabled', False)),
                    "emiTenure": int(inv.get('emiTenure', 0) or 0),
                    "emiMonthlyAmount": float(inv.get('emiMonthlyAmount', 0) or 0),
                    "items": items,
                    "itemCount": len(items)
                })
            except Exception as item_err:
                logger.warning(f"Error processing invoice {inv.get('_id')}: {item_err}")
                continue

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
        logger.error(f"[get_customer_invoices] ❌ Invoices error: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Failed to fetch invoices",
            "message": str(e),
            "details": str(e)
        }), 500

@customer_portal_bp.route('/invoices/<invoice_id>/pdf', methods=['GET'])
@authenticate_token
def download_invoice_pdf(invoice_id):
    """Download invoice as PDF"""
    try:
        customer = get_current_customer()
        if not customer:
            return jsonify({"error": "Customer not found"}), 404

        db = get_db()
        # Verify ownership (can be by ID, phone, or email)
        customer_id = customer['_id']
        invoice = db.bills.find_one({
            "_id": ObjectId(invoice_id),
            "$or": [
                {"customerId": customer_id},
                {"customerId": str(customer_id)},
                {"customerPhone": customer.get('phone')},
                {"customerEmail": customer.get('email')}
            ]
        })

        if not invoice:
            return jsonify({"error": "Invoice not found or access denied"}), 404

        # Return the invoice data as JSON for the customer portal
        def safe_isoformat(dt):
            return dt.isoformat() if dt and hasattr(dt, 'isoformat') else str(dt)

        return jsonify({
            "id": str(invoice.get("_id")),
            "billNumber": invoice.get("billNumber"),
            "customerName": invoice.get("customerName"),
            "billDate": safe_isoformat(invoice.get("billDate")),
            "items": invoice.get("items", []),
            "subtotal": invoice.get("subtotal"),
            "discountPercent": invoice.get("discountPercent", 0),
            "discountAmount": invoice.get("discountAmount", 0),
            "cgst": invoice.get("cgst", 0),
            "sgst": invoice.get("sgst", 0),
            "igst": invoice.get("igst", 0),
            "gstAmount": invoice.get("gstAmount"),
            "grandTotal": invoice.get("grandTotal"),
            "paymentMode": invoice.get("paymentMode"),
            "emiDetails": invoice.get("emiDetails")
        })

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

        match_query = get_customer_match_query(customer)

        # Pagination
        page = max(1, int(request.args.get('page', 1)))
        limit = min(int(request.args.get('limit', 20)), 100)
        skip = (page - 1) * limit

        # Fetch warranties
        db = get_db()
        warranties_cursor = db.warranties.find(match_query).sort("expiryDate", 1).skip(skip).limit(limit)
        total = db.warranties.count_documents(match_query)

        warranties = []
        for w in warranties_cursor:
            try:
                expiry_date = w.get('expiryDate')
                start_date = w.get('startDate')
                days_left = 0
                status = 'expired'

                if expiry_date:
                    days_left = (expiry_date - utc_now()).days
                    if days_left > 0:
                        status = 'active'
                        if days_left <= 30:
                            status = 'expiring_soon'

                # Safe date conversion
                start_date_str = None
                if start_date:
                    start_date_str = start_date.isoformat() if hasattr(start_date, 'isoformat') else str(start_date)

                expiry_date_str = None
                if expiry_date:
                    expiry_date_str = expiry_date.isoformat() if hasattr(expiry_date, 'isoformat') else str(expiry_date)

                warranties.append({
                    "id": str(w['_id']),
                    "productName": str(w.get('productName', 'Unknown')),
                    "productSku": str(w.get('productSku', 'N/A')),
                    "warrantyType": str(w.get('warrantyType', 'Standard')),
                    "startDate": start_date_str,
                    "expiryDate": expiry_date_str,
                    "status": status,
                    "daysLeft": max(0, days_left),
                    "invoiceNumber": str(w.get('invoiceNo', 'N/A'))
                })
            except Exception as warranty_err:
                logger.warning(f"Error processing warranty {w.get('_id')}: {warranty_err}")
                continue

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
        logger.error(f"[get_customer_warranties] ❌ Warranties error: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Failed to fetch warranties",
            "message": str(e),
            "details": str(e)
        }), 500

@customer_portal_bp.route('/warranties/<warranty_id>/renew', methods=['POST'])
@authenticate_token
def renew_warranty(warranty_id):
    """Renew a warranty"""
    try:
        customer = get_current_customer()
        if not customer:
            return jsonify({"error": "Customer not found"}), 404

        customer_id = customer['_id']

        or_conditions = [
            {"customerId": customer_id},
            {"customerId": str(customer_id)}
        ]
        if customer.get('name') and str(customer.get('name')).lower() != "walk-in customer":
            or_conditions.append({"customerName": customer.get('name')})
        if customer.get('phone') and str(customer.get('phone')).strip() != "":
            or_conditions.append({"customerPhone": customer.get('phone')})
            
        match_query = {
            "_id": ObjectId(warranty_id),
            "$or": or_conditions
        }

        db = get_db()
        warranty = db.warranties.find_one(match_query)

        if not warranty:
            return jsonify({"error": "Warranty not found"}), 404

        data = request.get_json() or {}
        years = int(data.get('years', 1))

        # Calculate new expiry
        current_expiry = warranty.get('expiryDate', utc_now())
        new_expiry = current_expiry + timedelta(days=365 * years)

        # Update warranty
        db.warranties.update_one(
            {"_id": ObjectId(warranty_id)},
            {
                "$set": {
                    "expiryDate": new_expiry,
                    "renewalDate": utc_now(),
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

# ==================== EMI PLANS ====================

@customer_portal_bp.route('/emi', methods=['GET'])
@authenticate_token
def get_customer_emi_plans():
    """Get all EMI plans for current customer"""
    try:
        customer = get_current_customer()
        if not customer:
            return jsonify({"error": "Customer not found"}), 404

        match_query = get_customer_match_query(customer)

        # Pagination
        page = max(1, int(request.args.get('page', 1)))
        limit = min(int(request.args.get('limit', 20)), 100)
        skip = (page - 1) * limit

        # Fetch EMI plans
        db = get_db()
        emi_cursor = db.emi_plans.find(match_query).sort("createdAt", -1).skip(skip).limit(limit)
        total = db.emi_plans.count_documents(match_query)

        emi_plans = []
        for emi in emi_cursor:
            # Calculate paid and pending amounts
            installments = emi.get('installments', [])
            total_paid = sum(inst.get('paidAmount', 0) for inst in installments)
            total_pending = emi.get('totalAmount', 0) - total_paid
            
            # Count paid and pending installments
            paid_count = len([inst for inst in installments if inst.get('status') == 'paid'])
            pending_count = len([inst for inst in installments if inst.get('status') in ['pending', 'partial']])

            emi_plans.append({
                "id": str(emi['_id']),
                "billId": str(emi.get('billId')),
                "principalAmount": float(emi.get('principalAmount', 0)),
                "tenure": emi.get('tenure'),
                "monthlyEmi": float(emi.get('monthlyEmi', 0)),
                "totalAmount": float(emi.get('totalAmount', 0)),
                "totalPaid": float(total_paid),
                "totalPending": float(total_pending),
                "startDate": emi.get('startDate').isoformat() if emi.get('startDate') else None,
                "endDate": emi.get('endDate').isoformat() if emi.get('endDate') else None,
                "status": emi.get('status', 'active'),
                "installments": [
                    {
                        "installmentNo": inst.get('installmentNo'),
                        "dueDate": inst.get('dueDate').isoformat() if inst.get('dueDate') else None,
                        "amount": float(inst.get('amount', 0)),
                        "paidAmount": float(inst.get('paidAmount', 0)),
                        "status": inst.get('status'),
                        "paidDate": inst.get('paidDate').isoformat() if inst.get('paidDate') else None
                    }
                    for inst in installments
                ],
                "paidInstallments": paid_count,
                "pendingInstallments": pending_count
            })

        response = jsonify({
            "emiPlans": emi_plans,
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
        logger.error(f"EMI plans error: {e}")
        return jsonify({"error": "Failed to fetch EMI plans"}), 500

@customer_portal_bp.route('/emi/<emi_id>', methods=['GET'])
@authenticate_token
def get_emi_details(emi_id):
    """Get detailed information about a specific EMI plan"""
    try:
        customer = get_current_customer()
        if not customer:
            return jsonify({"error": "Customer not found"}), 404

        db = get_db()
        customer_id = customer['_id']
        
        # Verify ownership
        emi = db.emi_plans.find_one({
            "_id": ObjectId(emi_id),
            "$or": [
                {"customerId": customer_id},
                {"customerId": str(customer_id)},
                {"customerPhone": customer.get('phone')},
                {"customerEmail": customer.get('email')}
            ]
        })

        if not emi:
            return jsonify({"error": "EMI plan not found or access denied"}), 404

        # Calculate totals
        installments = emi.get('installments', [])
        total_paid = sum(inst.get('paidAmount', 0) for inst in installments)
        
        return jsonify({
            "id": str(emi['_id']),
            "billId": str(emi.get('billId')),
            "principalAmount": float(emi.get('principalAmount', 0)),
            "tenure": emi.get('tenure'),
            "monthlyEmi": float(emi.get('monthlyEmi', 0)),
            "totalAmount": float(emi.get('totalAmount', 0)),
            "totalPaid": float(total_paid),
            "totalPending": float(emi.get('totalAmount', 0) - total_paid),
            "startDate": emi.get('startDate').isoformat() if emi.get('startDate') else None,
            "endDate": emi.get('endDate').isoformat() if emi.get('endDate') else None,
            "status": emi.get('status'),
            "notes": emi.get('notes'),
            "installments": [
                {
                    "installmentNo": inst.get('installmentNo'),
                    "dueDate": inst.get('dueDate').isoformat() if inst.get('dueDate') else None,
                    "amount": float(inst.get('amount', 0)),
                    "paidAmount": float(inst.get('paidAmount', 0)),
                    "status": inst.get('status'),
                    "paidDate": inst.get('paidDate').isoformat() if inst.get('paidDate') else None,
                    "paymentMethod": inst.get('paymentMethod'),
                    "notes": inst.get('notes')
                }
                for inst in installments
            ]
        })

    except Exception as e:
        logger.error(f"EMI details error: {e}")
        return jsonify({"error": "Failed to fetch EMI details"}), 500

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
    """Password change is handled by customer_auth blueprint"""
    return jsonify({
        "error": "Use /api/customer-auth/change-password endpoint",
        "message": "Password changes should be done through the authentication endpoints"
    }), 400

@customer_portal_bp.route('/vcard', methods=['GET'])
@authenticate_token
def download_vcard():
    """Download vCard for the current customer"""
    try:
        customer = get_current_customer()
        if not customer:
            return jsonify({"error": "Customer not found"}), 404

        vcard_text = build_vcard(customer)
        safe_name = customer.get('name', 'contact').replace(' ', '_')
        
        return vcard_text, 200, {
            'Content-Type': 'text/vcard; charset=utf-8',
            'Content-Disposition': f'attachment; filename="{safe_name}.vcf"'
        }
    except Exception as e:
        logger.error(f"vCard error: {e}")
        return jsonify({"error": "Failed to generate vCard"}), 500

@customer_portal_bp.route('/pvc-card', methods=['GET'])
@authenticate_token
def download_pvc_card():
    """Download PVC-sized PDF card for the current customer"""
    try:
        customer = get_current_customer()
        if not customer:
            return jsonify({"error": "Customer not found"}), 404

        pdf_buffer = build_pvc_card_pdf(customer, COMPANY_NAME, COMPANY_PHONE)
        safe_name = customer.get('name', 'customer').replace(' ', '_')
        
        return send_file(
            pdf_buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f"card_{safe_name}.pdf"
        )
    except Exception as e:
        logger.error(f"PVC card error: {e}")
        return jsonify({"error": "Failed to generate identity card"}), 500
