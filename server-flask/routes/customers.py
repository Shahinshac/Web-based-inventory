import io
import logging
import secrets
from datetime import datetime, timedelta
from bson import ObjectId
from flask import Blueprint, request, jsonify, g, send_file

from database import get_db
from utils.auth_middleware import authenticate_token
from services.audit_service import log_audit
from utils.constants import COMPANY_NAME, COMPANY_PHONE
from services.customer_service import build_vcard, build_pvc_card_pdf

logger = logging.getLogger(__name__)

customers_bp = Blueprint('customers', __name__)

@customers_bp.route('/', methods=['GET'])
@authenticate_token
def get_customers():
    db = get_db()
    customers = db.customers.find().sort("name", 1)
    
    formatted = []
    for c in customers:
        formatted.append({
            "id": str(c['_id']),
            "name": c.get('name'),
            "phone": c.get('phone'),
            "email": c.get('email', ''),
            "company": c.get('company', ''),
            "position": c.get('position', ''),
            "website": c.get('website', ''),
            "pincode": c.get('pincode', ''),
            "place": c.get('place', ''),
            "city": c.get('city', ''),
            "country": c.get('country', ''),
            "address": c.get('address'),
            "state": c.get('state', 'Same'),
            "gstin": c.get('gstin', ''),
            "image_url": c.get('image_url', '')
        })
    
    return jsonify(formatted)

@customers_bp.route('/', methods=['POST'])
@authenticate_token
def add_customer():
    data = request.get_json()
    name = data.get('name', '').strip()
    phone = data.get('phone', '').strip()
    email = data.get('email', '').strip()
    company = data.get('company', '').strip()
    position = data.get('position', '').strip()
    website = data.get('website', '').strip()
    address = data.get('address', '').strip()
    place = data.get('place', '').strip()
    city = data.get('city', '').strip()
    country = data.get('country', '').strip()
    pincode = data.get('pincode', '').strip()
    gstin = data.get('gstin', '').strip()

    user_id = g.user.get('userId')
    username = g.user.get('username', 'Unknown')

    if not name:
        return jsonify({"error": "Customer name is required"}), 400

    db = get_db()
    customer = {
        "name": name,
        "phone": phone,
        "email": email,
        "company": company,
        "position": position,
        "website": website,
        "address": address,
        "place": place,
        "city": city,
        "country": country,
        "pincode": pincode,
        "gstin": gstin,
        "purchasesCount": 0,
        "totalPurchases": 0,
        "createdAt": datetime.utcnow(),
        "createdBy": user_id,
        "createdByUsername": username
    }

    result = db.customers.insert_one(customer)
    customer_id = str(result.inserted_id)

    log_audit(db, "CUSTOMER_ADDED", user_id, username, {
        "customerId": customer_id,
        "customerName": name,
        "phone": phone
    })

    customer['id'] = customer_id
    if '_id' in customer:
        del customer['_id']
    # Convert datetime to string for JSON serialisation
    if customer.get('createdAt') and hasattr(customer['createdAt'], 'isoformat'):
        customer['createdAt'] = customer['createdAt'].isoformat()

    return jsonify(customer)

@customers_bp.route('/<id>', methods=['PUT'])
@authenticate_token
def update_customer(id):
    data = request.get_json()
    name = data.get('name', '').strip()
    phone = data.get('phone', '').strip()
    email = data.get('email', '').strip()
    company = data.get('company', '').strip()
    position = data.get('position', '').strip()
    website = data.get('website', '').strip()
    address = data.get('address', '').strip()
    place = data.get('place', '').strip()
    city = data.get('city', '').strip()
    country = data.get('country', '').strip()
    pincode = data.get('pincode', '').strip()
    gstin = data.get('gstin', '').strip()

    user_id = g.user.get('userId')
    username = g.user.get('username', 'Unknown')

    if not name:
        return jsonify({"error": "Customer name is required"}), 400

    db = get_db()
    existing_customer = db.customers.find_one({"_id": ObjectId(id)})
    if not existing_customer:
        return jsonify({"error": "Customer not found"}), 404

    updated_data = {
        "name": name,
        "phone": phone,
        "email": email,
        "company": company,
        "position": position,
        "website": website,
        "address": address,
        "place": place,
        "city": city,
        "country": country,
        "pincode": pincode,
        "gstin": gstin,
        "updatedAt": datetime.utcnow(),
        "updatedBy": user_id,
        "updatedByUsername": username
    }

    db.customers.update_one({"_id": ObjectId(id)}, {"$set": updated_data})

    log_audit(db, "CUSTOMER_UPDATED", user_id, username, {
        "customerId": id,
        "customerName": name,
        "changes": list(updated_data.keys())
    })

    existing_customer.update(updated_data)
    existing_customer['id'] = id
    if '_id' in existing_customer:
        del existing_customer['_id']
    # Serialise datetime fields
    for key in ('createdAt', 'updatedAt'):
        if key in existing_customer and hasattr(existing_customer[key], 'isoformat'):
            existing_customer[key] = existing_customer[key].isoformat()

    return jsonify(existing_customer)

@customers_bp.route('/<id>', methods=['DELETE'])
@authenticate_token
def delete_customer(id):
    user_id = g.user.get('userId')
    username = g.user.get('username', 'Unknown')
    db = get_db()

    customer = db.customers.find_one({"_id": ObjectId(id)})
    if not customer:
        return jsonify({"error": "Customer not found"}), 404

    # Check for linked bills before deleting
    bill_count = db.bills.count_documents({"customerId": ObjectId(id)})
    if bill_count > 0:
        return jsonify({"error": f"Cannot delete customer with {bill_count} existing bills. Archive customer instead."}), 400

    db.customers.delete_one({"_id": ObjectId(id)})

    log_audit(db, "CUSTOMER_DELETED", user_id, username, {
        "customerId": id,
        "customerName": customer.get('name'),
        "phone": customer.get('phone')
    })

    return jsonify({"success": True, "message": "Customer deleted successfully"})


@customers_bp.route('/<id>/whatsapp-share', methods=['POST'])
@authenticate_token
def customer_whatsapp_share(id):
    """Generate WhatsApp share link for customer card"""
    db = get_db()

    try:
        customer = db.customers.find_one({"_id": ObjectId(id)})
    except Exception:
        return jsonify({"error": "Invalid customer ID"}), 400

    if not customer:
        return jsonify({"error": "Customer not found"}), 404

    customer_phone = customer.get('phone')

    # Create public customer card link
    token = secrets.token_hex(16)
    expires = datetime.utcnow() + timedelta(days=7)  # Valid for 7 days

    db.public_customer_cards.insert_one({
        "token": token,
        "customerId": str(customer["_id"]),
        "createdAt": datetime.utcnow(),
        "expiresAt": expires,
        "companySnapshot": {
            "name": COMPANY_NAME,
            "phone": COMPANY_PHONE
        }
    })

    public_url = f"{request.host_url.rstrip('/')}/public/customer-card/{token}"

    import urllib.parse
    message = f"Hi {customer.get('name', 'Customer')}, here's your customer card from {COMPANY_NAME}. View: {public_url}"

    whatsapp_url = None
    if customer_phone:
        clean_phone = ''.join(c for c in str(customer_phone) if c.isdigit())
        if len(clean_phone) == 10:
            clean_phone = f"91{clean_phone}"
        whatsapp_url = f"https://wa.me/{clean_phone}?text={urllib.parse.quote(message)}"

    return jsonify({
        "publicUrl": public_url,
        "whatsappUrl": whatsapp_url,
        "token": token,
        "hasPhone": bool(customer_phone),
        "customerName": customer.get('name', 'Customer')
    })

@customers_bp.route('/<id>/vcard', methods=['GET'])
@authenticate_token
def get_customer_vcard(id):
    """Return vCard 3.0 formatted text for the given customer."""
    db = get_db()
    customer = db.customers.find_one({"_id": ObjectId(id)})
    if not customer:
        return jsonify({"error": "Customer not found"}), 404

    vcard_text = build_vcard(customer)
    return vcard_text, 200, {
        'Content-Type': 'text/vcard; charset=utf-8',
        'Content-Disposition': f'attachment; filename="{customer.get("name", "contact").replace(" ", "_")}.vcf"'
    }


@customers_bp.route('/<id>/pvc-card-pdf', methods=['GET'])
@authenticate_token
def get_pvc_card_pdf(id):
    """Generate and return a PVC (credit card) sized PDF for the given customer."""
    db = get_db()
    try:
        customer = db.customers.find_one({"_id": ObjectId(id)})
    except Exception:
        return jsonify({"error": "Invalid customer ID"}), 400

    if not customer:
        return jsonify({"error": "Customer not found"}), 404

    pdf_buffer = build_pvc_card_pdf(customer, COMPANY_NAME, COMPANY_PHONE)
    safe_name = customer.get('name', 'customer').replace(' ', '_')
    return send_file(
        pdf_buffer,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f"{safe_name}_card.pdf"
    )

@customers_bp.route('/<id>/purchases', methods=['GET'])
@authenticate_token
def get_customer_purchases(id):
    """Fetch all purchase history and associated warranties for a customer."""
    db = get_db()
    try:
        customer = db.customers.find_one({"_id": ObjectId(id)})
        if not customer:
            return jsonify({"error": "Customer not found"}), 404
        
        # Smart Match Query: Find bills by ID, Phone, or exact Name
        match_conditions = [{"customerId": ObjectId(id)}]
        if customer.get('phone'):
            match_conditions.append({"customerPhone": customer['phone']})
        if customer.get('name') and customer['name'].lower() != 'walk-in customer':
            match_conditions.append({"customerName": customer['name']})
            
        match_query = {"$or": match_conditions}
        
        # Fetch Bills
        bills_cursor = db.bills.find(match_query).sort("billDate", -1)
        bills = []
        for bill in bills_cursor:
            bills.append({
                "id": str(bill['_id']),
                "billNumber": bill.get('billNumber'),
                "billDate": bill.get('billDate').isoformat() if bill.get('billDate') else None,
                "total": float(bill.get('total') or bill.get('grandTotal') or 0),
                "paymentMode": bill.get('paymentMode', 'cash'),
                "items": bill.get('items', [])
            })
            
        # Fetch Warranties
        warranties_cursor = db.warranties.find(match_query).sort("expiryDate", -1)
        warranties = []
        for w in warranties_cursor:
            warranties.append({
                "id": str(w['_id']),
                "productName": w.get('productName'),
                "productSku": w.get('productSku'),
                "startDate": w.get('startDate').isoformat() if w.get('startDate') else None,
                "expiryDate": w.get('expiryDate').isoformat() if w.get('expiryDate') else None,
                "status": w.get('status', 'active')
            })
            
        return jsonify({
            "customerId": id,
            "customerName": customer.get('name'),
            "bills": bills,
            "warranties": warranties,
            "stats": {
                "totalSpent": sum(b['total'] for b in bills),
                "purchaseCount": len(bills),
                "activeWarranties": len([w for w in warranties if w['status'] == 'active'])
            }
        })
    except Exception as e:
        logger.error(f"Error fetching customer purchases: {e}")
        return jsonify({"error": str(e)}), 500


