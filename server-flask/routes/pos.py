import logging
import os
import secrets
from datetime import datetime, timedelta
from bson import ObjectId
from flask import Blueprint, request, jsonify, g, url_for

from database import get_db
from utils.auth_middleware import authenticate_token
from services.audit_service import log_audit
from utils.constants import COMPANY_NAME, COMPANY_PHONE, COMPANY_ADDRESS, COMPANY_EMAIL, COMPANY_GSTIN

logger = logging.getLogger(__name__)

pos_bp = Blueprint('pos', __name__)

@pos_bp.route('/', methods=['POST'])
@authenticate_token
def checkout():
    data = request.get_json()
    items = data.get('items', [])
    if not isinstance(items, list) or len(items) == 0:
        return jsonify({"error": "Cart cannot be empty"}), 400

    customer_id = data.get('customerId')
    discount_percent = float(data.get('discountPercent') or 0)
    customer_state = data.get('customerState', 'Same')
    payment_mode = str(data.get('paymentMode', 'cash')).lower()
    
    user_id = g.user.get('userId')
    username = g.user.get('username', 'Unknown')

    split_payment_details = None
    if payment_mode == 'split':
        spd = data.get('splitPaymentDetails', {})
        split_payment_details = {
            "cashAmount": float(spd.get('cash', data.get('cashAmount', 0))),
            "upiAmount": float(spd.get('upi', data.get('upiAmount', 0))),
            "cardAmount": float(spd.get('card', data.get('cardAmount', 0))),
            "totalAmount": float(data.get('total') or data.get('totalAmount') or 0)
        }

    db = get_db()

    # Get customer details
    customer_name = "Walk-in Customer"
    customer_phone = None
    customer_address = ""
    customer_place = ""
    customer_pincode = ""

    if customer_id:
        try:
            customer = db.customers.find_one({"_id": ObjectId(customer_id)})
            if customer:
                customer_name = customer.get('name')
                customer_phone = customer.get('phone')
                customer_address = customer.get('address', '')
                customer_place = customer.get('place', '')
                customer_pincode = customer.get('pincode', '')
        except Exception:
            pass # Invalid ObjectId

    # Generate Invoice Number
    current_year = datetime.utcnow().year
    prefix = f"INV-{current_year}-"
    # To find count, regex search is simple
    bill_count = db.bills.count_documents({"billNumber": {"$regex": f"^{prefix}"}})
    bill_number = f"{prefix}{str(bill_count + 1).zfill(4)}"

    subtotal = 0.0
    total_cost = 0.0
    is_same_state = (customer_state == 'Same')

    bill_date = datetime.utcnow()
    client_time = data.get('clientTime')
    if client_time:
        try:
            # simple parse if provided
            # JavaScript date string e.g., "2023-10-15T12:00:00Z"
            from dateutil import parser
            bill_date = parser.parse(client_time)
        except Exception:
            pass

    bill = {
        "billNumber": bill_number,
        "customerId": ObjectId(customer_id) if customer_id else None,
        "customerName": customer_name,
        "customerPhone": customer_phone,
        "customerAddress": customer_address,
        "customerState": customer_state,
        "customerPlace": customer_place,
        "customerPincode": customer_pincode,
        "isSameState": is_same_state,
        "discountPercent": discount_percent,
        "paymentMode": payment_mode,
        "paymentStatus": "Paid",
        "billDate": bill_date,
        "items": [],
        "createdBy": user_id,
        "createdByUsername": username
    }

    if split_payment_details:
        bill["splitPaymentDetails"] = split_payment_details

    # Calculate item aggregates
    for it in items:
        prod_id = it.get('productId')
        if not prod_id: continue

        product = db.products.find_one({"_id": ObjectId(prod_id)})
        if not product: continue

        qty = float(it.get('quantity', 0))
        unit_price = float(it.get('price', 0))
        prod_cost = float(product.get('costPrice', 0))

        line_subtotal = unit_price * qty
        line_cost = prod_cost * qty
        line_profit = line_subtotal - line_cost

        bill["items"].append({
            "productId": ObjectId(prod_id),
            "productName": product.get('name'),
            "hsnCode": product.get('hsnCode', '9999'),
            "quantity": qty,
            "costPrice": prod_cost,
            "unitPrice": unit_price,
            "lineSubtotal": line_subtotal,
            "lineCost": line_cost,
            "lineProfit": line_profit
        })

        subtotal += line_subtotal
        total_cost += line_cost

        # Substr inventory
        db.products.update_one(
            {"_id": ObjectId(prod_id)},
            {"$inc": {"quantity": -qty}}
        )

    # Tax & Discount Math
    discount_amount = (subtotal * discount_percent) / 100
    after_discount = subtotal - discount_amount

    cgst = sgst = igst = gst_amount = 0.0
    if is_same_state:
        cgst = after_discount * 0.09
        sgst = after_discount * 0.09
        gst_amount = cgst + sgst
    else:
        igst = after_discount * 0.18
        gst_amount = igst

    grand_total = after_discount + gst_amount
    total_profit = subtotal - total_cost - discount_amount  # Profit after discount before tax

    bill["subtotal"] = round(subtotal, 2)
    bill["discountAmount"] = round(discount_amount, 2)
    bill["afterDiscount"] = round(after_discount, 2)
    bill["cgst"] = round(cgst, 2)
    bill["sgst"] = round(sgst, 2)
    bill["igst"] = round(igst, 2)
    bill["gstAmount"] = round(gst_amount, 2)
    bill["grandTotal"] = round(grand_total) # Nearest integer
    bill["totalCost"] = round(total_cost, 2)
    bill["totalProfit"] = round(total_profit, 2)

    result = db.bills.insert_one(bill)

    log_audit(db, "SALE_COMPLETED", user_id, username, {
        "billId": str(result.inserted_id),
        "billNumber": bill_number,
        "customerName": customer_name,
        "grandTotal": getattr(bill, 'grandTotal', round(grand_total)),
        "itemCount": len(bill["items"]),
        "paymentMode": payment_mode
    })

    # Prepare response JSON (converting objectids, dates)
    return jsonify({
        "billId": str(result.inserted_id),
        "billNumber": bill_number,
        "customerName": customer_name,
        "customerPhone": customer_phone,
        "customerPlace": customer_place,
        "paymentMode": payment_mode,
        "billDate": bill_date.isoformat() + ("Z" if not bill_date.tzinfo else ""),
        "items": [{
            "productName": i["productName"],
            "quantity": i["quantity"],
            "unitPrice": i["unitPrice"],
            "lineSubtotal": i["lineSubtotal"]
        } for i in bill["items"]],
        "subtotal": bill["subtotal"],
        "discountPercent": discount_percent,
        "discountAmount": bill["discountAmount"],
        "gstAmount": bill["gstAmount"],
        "grandTotal": bill["grandTotal"],
        "profit": bill["totalProfit"]
    })

@pos_bp.route('/', methods=['GET'])
@authenticate_token
def get_invoices():
    db = get_db()
    bills = db.bills.find().sort("billDate", -1).limit(100)
    
    formatted = []
    for b in bills:
        spd = b.get("splitPaymentDetails")
        formatted.append({
            "id": str(b["_id"]),
            "billNumber": b.get("billNumber", str(b["_id"])),
            "customerId": str(b["customerId"]) if b.get("customerId") else None,
            "customerName": b.get("customerName", "Walk-in Customer"),
            "customerPhone": b.get("customerPhone"),
            "customerPlace": b.get("customerPlace"),
            "customerAddress": b.get("customerAddress", ""),
            "subtotal": b.get("subtotal", 0),
            "discountPercent": b.get("discountPercent", 0),
            "discountAmount": b.get("discountAmount", 0),
            "taxRate": 18 if (b.get("cgst", 0) > 0 or b.get("igst", 0) > 0) else 0,
            "taxAmount": b.get("gstAmount", 0),
            "cgst": b.get("cgst", 0),
            "sgst": b.get("sgst", 0),
            "igst": b.get("igst", 0),
            "gstAmount": b.get("gstAmount", 0),
            "grandTotal": b.get("grandTotal", 0),
            "total": b.get("grandTotal", 0),
            "paymentMode": b.get("paymentMode", "cash"),
            "paymentStatus": b.get("paymentStatus", "Paid"),
            "splitPaymentDetails": spd,
            "items": [{
                "productId": str(i.get("productId")) if i.get("productId") else None,
                "name": i.get("productName", "Unknown"),
                "hsnCode": i.get("hsnCode", "9999"),
                "quantity": i.get("quantity", 0),
                "price": i.get("unitPrice", 0),
                "lineSubtotal": i.get("lineSubtotal", 0)
            } for i in b.get("items", [])],
            "date": (b.get("billDate", datetime.utcnow()).isoformat() + ("Z" if not b.get("billDate", datetime.utcnow()).tzinfo else "")) if isinstance(b.get("billDate"), datetime) else str(b.get("billDate", "")),
            "createdByUsername": b.get("createdByUsername", "Unknown"),
            "companyPhone": COMPANY_PHONE
        })
    return jsonify(formatted)

@pos_bp.route('/<id>', methods=['GET'])
def get_invoice(id):
    db = get_db()
    try:
        invoice = db.bills.find_one({"_id": ObjectId(id)})
    except Exception:
        invoice = db.bills.find_one({"billNumber": id})

    if not invoice:
        return jsonify({"error": "Invoice not found"}), 404

    return jsonify({
        "id": str(invoice["_id"]),
        "billNumber": invoice.get("billNumber"),
        "customerName": invoice.get("customerName"),
        "customerPhone": invoice.get("customerPhone"),
        "customerAddress": invoice.get("customerAddress"),
        "billDate": (invoice.get("billDate").isoformat() + ("Z" if not invoice.get("billDate").tzinfo else "")) if isinstance(invoice.get("billDate"), datetime) else str(invoice.get("billDate")),
        "items": [{
             "productName": i.get("productName"),
             "quantity": i.get("quantity"),
             "unitPrice": i.get("unitPrice"),
             "lineSubtotal": i.get("lineSubtotal")
        } for i in invoice.get("items", [])],
        "subtotal": invoice.get("subtotal"),
        "discountAmount": invoice.get("discountAmount"),
        "gstAmount": invoice.get("gstAmount"),
        "grandTotal": invoice.get("grandTotal"),
        "paymentMode": invoice.get("paymentMode")
    })

@pos_bp.route('/<id>/public', methods=['POST'])
def create_public_link(id):
    db = get_db()
    try:
        invoice = db.bills.find_one({"_id": ObjectId(id)})
    except Exception:
        invoice = db.bills.find_one({"billNumber": id})

    if not invoice:
        return jsonify({"error": "Invoice not found"}), 404

    token = secrets.token_hex(16)
    expires = datetime.utcnow() + timedelta(days=1)

    db.public_invoice_links.insert_one({
        "token": token,
        "invoiceId": str(invoice["_id"]),
        "createdAt": datetime.utcnow(),
        "expiresAt": expires,
        "createdBy": "system",
        "companySnapshot": {
            "name": COMPANY_NAME,
            "phone": COMPANY_PHONE,
            "address": COMPANY_ADDRESS,
            "email": COMPANY_EMAIL,
            "gstin": COMPANY_GSTIN
        }
    })

    public_url = f"{request.host_url.rstrip('/')}/public/invoice/{token}"

    return jsonify({
        "publicUrl": public_url,
        "token": token,
        "expiresAt": expires.isoformat()
    })

@pos_bp.route('/<id>/whatsapp-link', methods=['POST'])
def whatsapp_link(id):
    db = get_db()
    try:
        invoice = db.bills.find_one({"_id": ObjectId(id)})
    except Exception:
        invoice = db.bills.find_one({"billNumber": id})

    if not invoice:
        return jsonify({"error": "Invoice not found"}), 404

    customer_phone = invoice.get('customerPhone')
    if not customer_phone and invoice.get('customerId'):
        cust = db.customers.find_one({"_id": invoice.get('customerId')})
        if cust:
            customer_phone = cust.get('phone')

    # Create link
    token = secrets.token_hex(16)
    expires = datetime.utcnow() + timedelta(days=1)
    db.public_invoice_links.insert_one({
        "token": token,
        "invoiceId": str(invoice["_id"]),
        "createdAt": datetime.utcnow(),
        "expiresAt": expires,
        "createdBy": "system",
        "companySnapshot": {
            "name": COMPANY_NAME,
            "phone": COMPANY_PHONE
        }
    })

    public_url = f"{request.host_url.rstrip('/')}/public/invoice/{token}"
    
    import urllib.parse
    message = f"Hi {invoice.get('customerName', 'Customer')}, here's your invoice #{invoice.get('billNumber')} from {COMPANY_NAME}. Total: Rs{invoice.get('grandTotal')}. View: {public_url}"
    
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
        "customerName": invoice.get('customerName', 'Customer')
    })
