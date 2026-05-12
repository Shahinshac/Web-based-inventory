from flask import Blueprint, jsonify, request, g
from database import get_db
from utils.auth_middleware import authenticate_token, require_admin
from bson import ObjectId
import logging
from utils.tzutils import to_iso_string

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
        
        # Pre-fetch all customers to avoid N+1 queries (optimized approach)
        customers_cursor = db.customers.find({}, {"name": 1})
        customer_map = {str(c['_id']): c.get('name') for c in customers_cursor}
        
        warranties_list = []
        for w in warranties_cursor:
            cust_id_str = str(w.get('customerId')) if w.get('customerId') else None
            
            # Use stored name or look up from our map
            name = w.get('customerName')
            if not name and cust_id_str in customer_map:
                name = customer_map[cust_id_str]
            
            warranties_list.append({
                "_id": str(w['_id']),
                "id": str(w['_id']),
                "customerId": cust_id_str,
                "customerName": name or 'N/A',
                "customerPhone": w.get('customerPhone', 'N/A'),
                "productName": w.get('productName', 'N/A'),
                "serialNumber": w.get('serialNumber') or w.get('productSku', 'N/A'),
                "purchaseDate": to_iso_string(w.get('startDate')),
                "expiryDate": to_iso_string(w.get('expiryDate')),
                "status": w.get('status', 'active'),
                "invoiceNumber": w.get('invoiceNo', 'N/A')
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
