import logging
import os
import secrets
import urllib.parse
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
    customer_email = None
    customer_address = ""
    customer_place = ""
    customer_pincode = ""

    if customer_id:
        try:
            customer = db.customers.find_one({"_id": ObjectId(customer_id)})
            if customer:
                customer_name = customer.get('name')
                customer_phone = customer.get('phone')
                customer_email = customer.get('email')
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

    # Set exact local time (IST is +5:30 ahead of UTC)
    bill_date = datetime.utcnow() + timedelta(hours=5, minutes=30)
    client_time = data.get('clientTime')
    if client_time:
        try:
            # simple parse if provided
            # JavaScript date string e.g., "2023-10-15T12:00:00Z"
            from dateutil import parser
            parsed_time = parser.parse(client_time)
            bill_date = parsed_time
        except Exception:
            pass

    bill = {
        "billNumber": bill_number,
        "customerId": ObjectId(customer_id) if customer_id else None,
        "customerName": customer_name,
        "customerPhone": customer_phone,
        "customerEmail": customer_email,
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
    # discount_factor is applied proportionally to each item's subtotal for per-item GST
    discount_factor = 1.0 - (discount_percent / 100.0)

    for it in items:
        prod_id = it.get('productId')
        if not prod_id: continue

        product = db.products.find_one({"_id": ObjectId(prod_id)})
        if not product: continue

        qty = float(it.get('quantity', 0))
        unit_price = float(it.get('price', 0)) # Inclusive of GST
        prod_cost = float(product.get('costPrice', 0))
        line_gst_percent = float(product.get('gstPercent', 18) or 18)
        
        # Extract base price by removing GST component
        gst_factor = 1 + (line_gst_percent / 100.0)
        base_unit_price = unit_price / gst_factor

        line_subtotal_inclusive = unit_price * qty
        line_subtotal_base = base_unit_price * qty
        line_cost = prod_cost * qty
        line_profit = line_subtotal_base - line_cost

        # Taxable value for this line (base subtotal after proportional discount)
        line_taxable = line_subtotal_base * discount_factor
        # GST amount for this line
        line_gst_amount = round(line_taxable * (line_gst_percent / 100.0), 2)

        bill["items"].append({
            "productId": ObjectId(prod_id),
            "productName": product.get('name'),
            "hsnCode": product.get('hsnCode', '9999'),
            "quantity": qty,
            "costPrice": prod_cost,
            "unitPrice": unit_price, # Store inclusive price to match UI
            "gstPercent": line_gst_percent,
            "lineSubtotal": line_subtotal_inclusive, # Store inclusive subtotal
            "lineCost": line_cost,
            "lineProfit": line_profit,
            "lineGstAmount": line_gst_amount
        })

        # We accumulate inclusive sum for the bill's subtotal
        subtotal += line_subtotal_inclusive
        total_cost += line_cost

        # Deduct inventory
        db.products.update_one(
            {"_id": ObjectId(prod_id)},
            {"$inc": {"quantity": -qty}}
        )

    # Tax & Discount Math (subtotal is inclusive of GST)
    discount_amount = (subtotal * discount_percent) / 100
    after_discount = subtotal - discount_amount

    # GST is collected for the government and is NOT company revenue or profit.
    gst_amount = sum(i["lineGstAmount"] for i in bill["items"])

    cgst = sgst = igst = 0.0
    if is_same_state:
        cgst = round(gst_amount / 2, 2)
        sgst = round(gst_amount - cgst, 2)  # Derived to ensure cgst + sgst == gst_amount
    else:
        igst = round(gst_amount, 2)      # Full GST as IGST

    # grand_total is already after_discount because after_discount is inclusive of GST
    grand_total = after_discount
    
    # Profit = (revenue excluding GST) minus cost of goods sold (COGS).
    # Since total_profit is calculated via per-item line_profit, we sum it and apply discount factor 
    # to account for the profit loss due to the global discount.
    pre_discount_profit = sum(i["lineProfit"] for i in bill["items"])
    # The discount effectively eats directly into profit (base amount lost)
    total_base_lost_to_discount = (subtotal - gst_amount) * (discount_percent / 100.0)
    total_profit = pre_discount_profit - total_base_lost_to_discount

    bill["subtotal"] = round(subtotal, 2)
    bill["discountAmount"] = round(discount_amount, 2)
    bill["afterDiscount"] = round(after_discount, 2)
    bill["cgst"] = round(cgst, 2)
    bill["sgst"] = round(sgst, 2)
    bill["igst"] = round(igst, 2)
    bill["gstAmount"] = round(gst_amount, 2)
    bill["grandTotal"] = round(grand_total)  # Nearest integer
    bill["totalCost"] = round(total_cost, 2)
    bill["totalProfit"] = round(total_profit, 2)

    result = db.bills.insert_one(bill)

    # Auto-generate warranties for registered customers (1 year from invoice date)
    if customer_id:
        for i in bill["items"]:
            db.warranties.insert_one({
                "customerId": ObjectId(customer_id),
                "productName": i["productName"],
                "productSku": i.get("hsnCode", "N/A"),
                "warrantyType": "1 Year Standard",
                "startDate": bill_date,
                "expiryDate": bill_date + timedelta(days=365),
                "status": "active",
                "invoiceNo": bill_number, 
                "createdAt": datetime.utcnow() + timedelta(hours=5, minutes=30)
            })

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
        "billDate": bill_date.isoformat(),
        "isSameState": is_same_state,
        "items": [{
            "productName": i["productName"],
            "hsnCode": i["hsnCode"],
            "quantity": i["quantity"],
            "unitPrice": i["unitPrice"],
            "gstPercent": i["gstPercent"],
            "lineSubtotal": i["lineSubtotal"],
            "lineGstAmount": i["lineGstAmount"]
        } for i in bill["items"]],
        "subtotal": bill["subtotal"],
        "discountPercent": discount_percent,
        "discountAmount": bill["discountAmount"],
        "afterDiscount": bill["afterDiscount"],
        "cgst": bill["cgst"],
        "sgst": bill["sgst"],
        "igst": bill["igst"],
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
            "date": b.get("billDate", datetime.utcnow()).isoformat() if isinstance(b.get("billDate"), datetime) else str(b.get("billDate", "")),
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
        "customerPlace": invoice.get("customerPlace", ""),
        "isSameState": invoice.get("isSameState", True),
        "billDate": invoice.get("billDate").isoformat() if isinstance(invoice.get("billDate"), datetime) else str(invoice.get("billDate")),
        "items": [{
             "productName": i.get("productName"),
             "hsnCode": i.get("hsnCode", "9999"),
             "quantity": i.get("quantity"),
             "unitPrice": i.get("unitPrice"),
             "gstPercent": i.get("gstPercent", 18),
             "lineSubtotal": i.get("lineSubtotal"),
             "lineGstAmount": i.get("lineGstAmount", 0)
        } for i in invoice.get("items", [])],
        "subtotal": invoice.get("subtotal"),
        "discountPercent": invoice.get("discountPercent", 0),
        "discountAmount": invoice.get("discountAmount"),
        "afterDiscount": invoice.get("afterDiscount"),
        "cgst": invoice.get("cgst", 0),
        "sgst": invoice.get("sgst", 0),
        "igst": invoice.get("igst", 0),
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
    try:
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
                "phone": COMPANY_PHONE,
                "address": COMPANY_ADDRESS,
                "email": COMPANY_EMAIL,
                "gstin": COMPANY_GSTIN
            }
        })

        public_url = f"{request.host_url.rstrip('/')}/public/invoice/{token}"

        portal_message = (
            f"\n\n🎁 *Customer Portal:*"
            f"\nRegister & login to view your invoices, warranties and purchase history."
            f"\n🔗 https://26-07inventory.vercel.app"
            f"\n(Use the email you provided during billing)"
        )
        message = f"Hi {invoice.get('customerName', 'Customer')}, here's your invoice #{invoice.get('billNumber')} from {COMPANY_NAME}. Total: Rs{invoice.get('grandTotal')}.\n\n📄 View Invoice: {public_url}{portal_message}"

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
    except Exception as e:
        logger.error(f"WhatsApp link error: {e}", exc_info=True)
        return jsonify({"error": f"Failed to generate WhatsApp link: {str(e)}"}), 500

