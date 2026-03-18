import logging
from datetime import datetime
from bson import ObjectId
from flask import Blueprint, request, jsonify, g

from database import get_db
from utils.auth_middleware import authenticate_token
from services.audit_service import log_audit

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
            "pincode": c.get('pincode', ''),
            "place": c.get('place', ''),
            "address": c.get('address'),
            "state": c.get('state', 'Same'),
            "gstin": c.get('gstin', '')
        })
    
    return jsonify(formatted)

@customers_bp.route('/', methods=['POST'])
@authenticate_token
def add_customer():
    data = request.get_json()
    name = data.get('name', '').strip()
    phone = data.get('phone', '').strip()
    address = data.get('address', '').strip()
    place = data.get('place', '').strip()
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
        "address": address,
        "place": place,
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
    # Remove _id from dict to make it JSON serializable if needed
    if '_id' in customer:
        del customer['_id']

    return jsonify(customer)

@customers_bp.route('/<id>', methods=['PUT'])
@authenticate_token
def update_customer(id):
    data = request.get_json()
    name = data.get('name', '').strip()
    phone = data.get('phone', '').strip()
    address = data.get('address', '').strip()
    place = data.get('place', '').strip()
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
        "address": address,
        "place": place,
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
        "changes": updated_data
    })

    # Return merged object
    existing_customer.update(updated_data)
    existing_customer['id'] = id
    if '_id' in existing_customer:
        del existing_customer['_id']

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

    # Check for linked invoices before deleting
    invoice_count = db.bills.count_documents({"customerId": ObjectId(id)})
    if invoice_count > 0:
        return jsonify({"error": f"Cannot delete customer with {invoice_count} existing invoices. Archive customer instead."}), 400

    db.customers.delete_one({"_id": ObjectId(id)})

    log_audit(db, "CUSTOMER_DELETED", user_id, username, {
        "customerId": id,
        "customerName": customer.get('name'),
        "phone": customer.get('phone')
    })

    return jsonify({"success": True, "message": "Customer deleted successfully"})
