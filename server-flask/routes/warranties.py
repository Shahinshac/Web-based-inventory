from flask import Blueprint, jsonify, request, g
from database import get_db
from utils.auth_middleware import authenticate_token, require_admin
from bson import ObjectId
import logging
from utils.tzutils import to_iso_string, utc_now
from datetime import timedelta

logger = logging.getLogger(__name__)

warranties_bp = Blueprint('warranties', __name__)

@warranties_bp.route('/', methods=['GET'])
@authenticate_token
@require_admin
def get_all_warranties():
    """Fetch all warranties for admin dashboard."""
    try:
        db = get_db()
        # Fetch all warranties, sorted by purchase date (newest first)
        warranties_cursor = db.warranties.find().sort("startDate", -1).limit(1000)
        
        # Pre-fetch all customers to avoid N+1 queries
        customers_cursor = db.customers.find({}, {"name": 1})
        customer_map = {str(c['_id']): c.get('name') for c in customers_cursor}
        
        # Pre-fetch all products to get renewal prices
        products_cursor = db.products.find({}, {"name": 1, "warrantyRenewalPrice": 1})
        product_map = {str(p['_id']): p for p in products_cursor}
        
        warranties_list = []
        for w in warranties_cursor:
            cust_id_str = str(w.get('customerId')) if w.get('customerId') else None
            prod_id_str = str(w.get('productId')) if w.get('productId') else None
            
            # Use stored name or look up from our map
            name = w.get('customerName')
            if not name and cust_id_str in customer_map:
                name = customer_map[cust_id_str]
            
            # Get renewal price from product map
            renewal_price = 0
            if prod_id_str in product_map:
                renewal_price = product_map[prod_id_str].get('warrantyRenewalPrice', 0)
            
            warranties_list.append({
                "_id": str(w['_id']),
                "id": str(w['_id']),
                "productId": prod_id_str,
                "customerId": cust_id_str,
                "customerName": name or 'N/A',
                "customerPhone": w.get('customerPhone', 'N/A'),
                "productName": w.get('productName', 'N/A'),
                "serialNumber": w.get('serialNumber') or w.get('productSku', 'N/A'),
                "purchaseDate": to_iso_string(w.get('startDate')),
                "expiryDate": to_iso_string(w.get('expiryDate')),
                "status": w.get('status', 'active'),
                "invoiceNumber": w.get('invoiceNo', 'N/A'),
                "renewalPrice": renewal_price
            })
            
        return jsonify({
            "success": True,
            "warranties": warranties_list
        }), 200
    except Exception as e:
        logger.error(f"Error fetching warranties: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to fetch warranties", "message": str(e)}), 500

@warranties_bp.route('/<id>', methods=['PATCH'])
@authenticate_token
@require_admin
def update_warranty_status(id):
    """Update warranty status (active, claimed, expired)."""
    try:
        db = get_db()
        data = request.get_json()
        new_status = data.get('status')
        
        if not new_status:
            return jsonify({"error": "Status is required"}), 400
            
        result = db.warranties.update_one(
            {"_id": ObjectId(id)},
            {"$set": {"status": new_status}}
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Warranty not found"}), 404
            
        return jsonify({
            "success": True,
            "message": f"Warranty status updated to {new_status}"
        }), 200
    except Exception as e:
        logger.error(f"Error updating warranty: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to update warranty", "message": str(e)}), 500

@warranties_bp.route('/<id>/renew', methods=['POST'])
@authenticate_token
@require_admin
def renew_warranty(id):
    """Renew warranty and record payment."""
    try:
        db = get_db()
        data = request.get_json()
        payment_method = data.get('paymentMethod', 'Cash')
        
        warranty = db.warranties.find_one({"_id": ObjectId(id)})
        if not warranty:
            return jsonify({"error": "Warranty not found"}), 404
            
        product_id = warranty.get('productId')
        if not product_id:
            return jsonify({"error": "No product associated with this warranty. Cannot auto-calculate renewal price."}), 400
            
        product = db.products.find_one({"_id": ObjectId(product_id)})
        if not product:
            return jsonify({"error": "Associated product not found"}), 404
            
        renewal_price = float(product.get('warrantyRenewalPrice', 0))
        renewal_months = int(product.get('warrantyMonths', 12))
        
        # Calculate new expiry: extend from current date if expired, or from expiry date if still active
        now = utc_now()
        current_expiry = warranty.get('expiryDate')
        if not current_expiry or current_expiry < now:
            new_expiry = now + timedelta(days=30 * renewal_months)
        else:
            new_expiry = current_expiry + timedelta(days=30 * renewal_months)
            
        # 1. Update Warranty
        db.warranties.update_one(
            {"_id": ObjectId(id)},
            {
                "$set": {
                    "status": "active",
                    "expiryDate": new_expiry,
                    "lastRenewedAt": now
                },
                "$push": {
                    "renewalHistory": {
                        "date": now,
                        "price": renewal_price,
                        "months": renewal_months,
                        "paymentMethod": payment_method
                    }
                }
            }
        )
        
        # 2. Record as a Bill for reporting
        bill_count = db.bills.count_documents({})
        bill_number = f"REN-{now.strftime('%Y%m%d')}-{bill_count + 1}"
        
        renewal_bill = {
            "billNumber": bill_number,
            "billDate": now,
            "customerId": warranty.get('customerId'),
            "customerName": warranty.get('customerName'),
            "customerPhone": warranty.get('customerPhone'),
            "items": [{
                "productId": str(product_id),
                "productName": f"Warranty Renewal: {product.get('name')}",
                "quantity": 1,
                "price": renewal_price,
                "lineSubtotal": renewal_price,
                "lineProfit": renewal_price, # Renewal is pure profit usually? Or we can deduct some cost
                "hsnCode": "9987" # Service HSN
            }],
            "subtotal": renewal_price,
            "discountAmount": 0,
            "afterDiscount": renewal_price,
            "gstAmount": 0,
            "grandTotal": renewal_price,
            "totalProfit": renewal_price,
            "paymentMode": payment_method,
            "paymentStatus": "Paid",
            "isRenewal": True,
            "createdAt": now,
            "createdBy": g.user.get('userId'),
            "createdByUsername": g.user.get('username')
        }
        db.bills.insert_one(renewal_bill)
        
        return jsonify({
            "success": True,
            "message": f"Warranty renewed for {renewal_months} months. Payment of ₹{renewal_price} recorded.",
            "newExpiry": to_iso_string(new_expiry)
        }), 200
        
    except Exception as e:
        logger.error(f"Error renewing warranty: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to renew warranty", "message": str(e)}), 500
