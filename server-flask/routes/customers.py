import io
import logging
import re
import secrets
import urllib.parse
from datetime import datetime, timedelta
from bson import ObjectId
from flask import Blueprint, request, jsonify, g, send_file, current_app

from database import get_db
from utils.auth_middleware import authenticate_token
from services.audit_service import log_audit
from utils.constants import COMPANY_NAME, COMPANY_PHONE
from services.customer_service import build_vcard, build_pvc_card_pdf
from utils.tzutils import utc_now, to_iso_string

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
        "createdAt": utc_now(),
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
        "updatedAt": utc_now(),
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
    try:
        db = get_db()

        # Fetch customer
        try:
            customer = db.customers.find_one({"_id": ObjectId(id)})
        except Exception as e:
            logger.warning(f"Invalid customer ID format: {e}")
            return jsonify({"error": "Invalid customer ID"}), 400

        if not customer:
            return jsonify({"error": "Customer not found"}), 404

        customer_phone = customer.get('phone')
        customer_name = customer.get('name', 'Customer')

        # Create public customer card link
        try:
            token = secrets.token_hex(16)
            expires = utc_now() + timedelta(days=7)  # Valid for 7 days

            db.public_customer_cards.insert_one({
                "token": token,
                "customerId": str(customer["_id"]),
                "createdAt": utc_now(),
                "expiresAt": expires,
                "companySnapshot": {
                    "name": COMPANY_NAME,
                    "phone": COMPANY_PHONE
                }
            })
        except Exception as e:
            logger.error(f"Failed to create public customer card link: {e}")
            return jsonify({"error": "Failed to create public link"}), 500

        # Build public URL
        public_url = f"{request.host_url.rstrip('/')}/public/customer-card/{token}"

        # Build WhatsApp message
        portal_message = (
            f"\n\n🎁 *Customer Portal:*"
            f"\nRegister & login to view your invoices, warranties and purchase history."
            f"\n🔗 https://26-07inventory.vercel.app"
            f"\n(Use the email you provided during billing)"
        )
        message = f"Hi {customer_name}, here's your customer identity card from {COMPANY_NAME}.\n\n🆔 View Card: {public_url}{portal_message}"

        # Generate WhatsApp URL if phone exists
        whatsapp_url = None
        if customer_phone:
            try:
                # Clean phone number - extract only digits
                clean_phone = ''.join(c for c in str(customer_phone) if c.isdigit())

                # Validate phone length
                if not clean_phone:
                    logger.warning(f"Invalid phone number format: {customer_phone}")
                elif len(clean_phone) == 10:
                    # Indian phone: add country code
                    clean_phone = f"91{clean_phone}"
                elif len(clean_phone) < 10 or len(clean_phone) > 15:
                    logger.warning(f"Phone number out of valid range: {clean_phone}")
                    clean_phone = None

                if clean_phone:
                    whatsapp_url = f"https://wa.me/{clean_phone}?text={urllib.parse.quote(message)}"
            except Exception as e:
                logger.warning(f"Failed to generate WhatsApp URL: {e}")

        return jsonify({
            "publicUrl": public_url,
            "whatsappUrl": whatsapp_url,
            "token": token,
            "hasPhone": bool(customer_phone),
            "customerName": customer_name
        })

    except Exception as e:
        logger.error(f"Customer WhatsApp share error: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Failed to generate customer card link",
            "message": str(e) if current_app.config.get('DEBUG') else "An error occurred"
        }), 500


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
    logger.info(f"[get_customer_purchases] Request for customer ID: {id}")

    # Validate and fetch customer
    try:
        customer = db.customers.find_one({"_id": ObjectId(id)})
    except Exception as e:
        logger.warning(f"[get_customer_purchases] Invalid ObjectId format: {id}, error: {e}")
        return jsonify({"error": "Invalid customer ID format"}), 400

    if not customer:
        logger.warning(f"[get_customer_purchases] Customer not found for ID: {id}")
        return jsonify({"error": "Customer not found"}), 404

    customer_id = str(customer['_id'])
    customer_name = customer.get('name', 'Unknown')
    logger.info(f"[get_customer_purchases] Found customer: {customer_name} ({customer_id})")

    try:
        # Build aggressive matching conditions (ID, Phone, Email, Name)
        match_conditions = [
            {"customerId": ObjectId(id)},
            {"customerId": id}
        ]

        customer_phone = str(customer.get('phone', '')).strip()
        if customer_phone:
            logger.debug(f"[get_customer_purchases] Matching by phone: {customer_phone}")
            match_conditions.append({"customerPhone": customer_phone})

            normalized_phone = ''.join(ch for ch in customer_phone if ch.isdigit())
            if normalized_phone:
                match_conditions.append({"customerPhone": normalized_phone})

                if normalized_phone.startswith('91') and len(normalized_phone) > 10:
                    match_conditions.append({"customerPhone": normalized_phone[-10:]})

        customer_email = str(customer.get('email', '')).strip()
        if customer_email:
            logger.debug(f"[get_customer_purchases] Matching by email: {customer_email}")
            match_conditions.append({"customerEmail": customer_email})

            email_regex = re.compile(f"^{re.escape(customer_email)}$", re.I)
            match_conditions.append({"customerEmail": email_regex})

        customer_name = str(customer.get('name', '')).strip()
        if customer_name and customer_name.lower() != 'walk-in customer':
            logger.debug(f"[get_customer_purchases] Matching by name: {customer_name}")
            name_regex = re.compile(f"^{re.escape(customer_name)}$", re.I)
            match_conditions.append({"customerName": customer_name})
            match_conditions.append({"customerName": name_regex})

        match_query = {"$or": match_conditions}
        logger.debug(f"[get_customer_purchases] Match query with {len(match_conditions)} conditions")

        # Fetch Bills with safe datetime handling
        bills_cursor = db.bills.find(match_query).sort("billDate", -1)
        bills = []
        bills_count = 0
        for bill in bills_cursor:
            bills_count += 1
            try:
                # Handle varied date formats and total fields
                b_date = bill.get('billDate')
                if isinstance(b_date, datetime):
                    b_date_str = b_date.isoformat()
                else:
                    b_date_str = str(b_date) if b_date else None

                bills.append({
                    "id": str(bill['_id']),
                    "billNumber": bill.get('billNumber', 'N/A'),
                    "billDate": b_date_str,
                    "total": float(bill.get('grandTotal') or bill.get('total') or 0),
                    "paymentMode": bill.get('paymentMode', 'cash'),
                    # EMI status: check emiDetails object (true source), fallback to root-level fields
                    "emiEnabled": bool(bill.get('emiDetails', {}).get('months', 0) > 0),
                    "emiTenure": int(bill.get('emiDetails', {}).get('months', 0) or 0),
                    "emiMonthlyAmount": float(bill.get('emiDetails', {}).get('emiAmount', 0) or 0),
                    "items": bill.get('items', [])
                })
            except Exception as bill_err:
                logger.warning(f"[get_customer_purchases] Error processing bill {bill.get('_id')}: {bill_err}")
                # Skip this bill and continue with next
                continue

        logger.info(f"[get_customer_purchases] Found {len(bills)} bills for customer {customer_name}")

        # Fetch Warranties with safe datetime handling
        warranties_cursor = db.warranties.find(match_query).sort("expiryDate", -1)
        warranties = []
        for w in warranties_cursor:
            try:
                s_date = w.get('startDate')
                e_date = w.get('expiryDate')

                # Safe datetime conversion
                start_date_str = None
                if isinstance(s_date, datetime):
                    start_date_str = s_date.isoformat()
                elif s_date:
                    start_date_str = str(s_date)

                expiry_date_str = None
                if isinstance(e_date, datetime):
                    expiry_date_str = e_date.isoformat()
                elif e_date:
                    expiry_date_str = str(e_date)

                warranties.append({
                    "id": str(w['_id']),
                    "productName": w.get('productName', 'Unknown Product'),
                    "productSku": w.get('productSku', 'N/A'),
                    "startDate": start_date_str,
                    "expiryDate": expiry_date_str,
                    "status": w.get('status', 'active')
                })
            except Exception as warranty_err:
                logger.warning(f"[get_customer_purchases] Error processing warranty {w.get('_id')}: {warranty_err}")
                # Skip this warranty and continue with next
                continue

        logger.info(f"[get_customer_purchases] Found {len(warranties)} warranties for customer {customer_name}")

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
        logger.error(f"[get_customer_purchases] Error fetching customer purchases for {customer_name}: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Failed to fetch customer purchase history",
            "message": str(e) if current_app.config.get('DEBUG') else "An error occurred while fetching purchase history"
        }), 500


