import logging
import bcrypt
import os
import shutil
from datetime import datetime
from bson import ObjectId
from flask import Blueprint, request, jsonify, g

from database import get_db
from utils.auth_middleware import authenticate_token, require_admin
from services.audit_service import log_audit
from utils.constants import ALLOW_ADMIN_PASSWORD_CHANGE

logger = logging.getLogger(__name__)

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/change-admin-password', methods=['POST'])
def change_admin_password():
    if not ALLOW_ADMIN_PASSWORD_CHANGE:
        return jsonify({"error": "Admin password change via API is disabled."}), 403
    
    data = request.get_json()
    admin_username = data.get('adminUsername')
    current_password = data.get('currentPassword')
    new_password = data.get('newPassword')
    logout_all = data.get('logoutAll', False)

    if not admin_username or not current_password or not new_password:
        return jsonify({"error": "Missing required fields"}), 400

    db = get_db()
    admin = db.users.find_one({"username": admin_username.lower(), "role": "admin"})
    
    if not admin:
        return jsonify({"error": "Admin user not found"}), 403

    if not bcrypt.checkpw(current_password.encode('utf-8'), admin['password'].encode('utf-8')):
        return jsonify({"error": "Current admin password incorrect"}), 401

    hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    db.users.update_one(
        {"_id": admin["_id"]},
        {"$set": {"password": hashed}, "$inc": {"sessionVersion": 1}}
    )

    if logout_all:
        db.users.update_many({}, {"$inc": {"sessionVersion": 1}})
        log_audit(db, "ADMIN_PASSWORD_CHANGED_INVALIDATE_ALL", None, admin_username, {"message": "Admin changed password and logged out all"})
    else:
        log_audit(db, "ADMIN_PASSWORD_CHANGED", None, admin_username, {"message": "Admin changed password"})

    return jsonify({"success": True, "message": "Admin password updated successfully"})

@admin_bp.route('/update-company-phone', methods=['POST'])
def update_company_phone():
    data = request.get_json()
    admin_username = data.get('adminUsername')
    admin_password = data.get('adminPassword')
    company_phone = data.get('companyPhone')

    if not admin_username or not admin_password or not company_phone:
        return jsonify({"error": "adminUsername, adminPassword and companyPhone are required"}), 400

    db = get_db()
    admin = db.users.find_one({"username": admin_username.lower(), "role": "admin"})
    
    if not admin or not bcrypt.checkpw(admin_password.encode('utf-8'), admin['password'].encode('utf-8')):
        return jsonify({"error": "Invalid admin credentials"}), 401

    import re
    phone_clean = str(company_phone).strip()
    if not re.match(r'^[0-9+\-()\s]{6,30}$', phone_clean):
        return jsonify({"error": "Invalid phone number format"}), 400

    result = db.bills.update_many({}, {"$set": {"companyPhone": phone_clean}})
    
    log_audit(db, "ADMIN_UPDATE_COMPANY_PHONE", str(admin["_id"]), admin["username"], {
        "companyPhone": phone_clean,
        "matched": result.matched_count,
        "modified": result.modified_count
    })
    
    return jsonify({"success": True, "message": f"Updated {result.modified_count} invoices with companyPhone {phone_clean}"})

@admin_bp.route('/clear-database', methods=['POST'])
def clear_database():
    data = request.get_json()
    admin_username = data.get('adminUsername')
    admin_password = data.get('adminPassword')

    if not admin_username or not admin_password:
        return jsonify({"error": "Admin credentials required"}), 400

    db = get_db()
    admin = db.users.find_one({"username": admin_username.lower(), "role": "admin"})
    
    if not admin or not bcrypt.checkpw(admin_password.encode('utf-8'), admin['password'].encode('utf-8')):
        return jsonify({"error": "Invalid admin credentials"}), 401

    results = {}
    collections_to_drop = [
        'products', 'customers', 'bills', 'invoices', 'expenses', 
        'audit_logs', 'product_images', 'user_images', 'returns',
        'public_invoice_links', 'notifications', 'categories'
    ]
    
    for coll in collections_to_drop:
        try:
            res = getattr(db, coll).delete_many({})
            results[coll] = res.deleted_count
        except Exception as e:
            results[coll] = 0
            logger.warning(f"Failed to clear {coll}: {e}")
        
    try:
        usr_res = db.users.delete_many({"role": {"$ne": "admin"}})
        results['users'] = usr_res.deleted_count
    except Exception as e:
        results['users'] = 0
        logger.warning(f"Failed to clear non-admin users: {e}")

    results['photos'] = 0
    total = sum(results.values())

    log_audit(db, "ADMIN_CLEAR_DATABASE", str(admin["_id"]), admin["username"], results)
    
    return jsonify({
        "success": True, 
        "message": "All data cleared successfully",
        "results": results,
        "total": total,
        "timestamp": datetime.utcnow().isoformat()
    })

@admin_bp.route('/database-stats', methods=['GET'])
@authenticate_token
def database_stats():
    db = get_db()
    stats = {
        "products": db.products.count_documents({}),
        "customers": db.customers.count_documents({}),
        "bills": db.bills.count_documents({}),
        "invoices": db.invoices.count_documents({}),
        "expenses": db.expenses.count_documents({}),
        "audit_logs": db.audit_logs.count_documents({}),
        "users": {
            "total": db.users.count_documents({}),
            "admins": db.users.count_documents({"role": "admin"}),
            "managers": db.users.count_documents({"role": "manager"}),
            "cashiers": db.users.count_documents({"role": "cashier"})
        },
        "returns": db.returns.count_documents({})
    }
    
    try:
        db_stats = db.command("dbstats")
        stats["database"] = {
            "size": db_stats.get("dataSize"),
            "storageSize": db_stats.get("storageSize"),
            "collections": db_stats.get("collections"),
            "indexes": db_stats.get("indexes")
        }
    except Exception as e:
        logger.warning(f"Could not fetch database stats: {e}")

    return jsonify({"success": True, "stats": stats})

@admin_bp.route('/audit-logs', methods=['GET'])
@authenticate_token
@require_admin
def get_audit_logs():
    db = get_db()
    limit = min(int(request.args.get('limit', 50)), 500)
    skip = int(request.args.get('skip', 0))
    action = request.args.get('action')
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')

    query = {}
    if action and action != 'all':
        query['action'] = action
        
    if start_date or end_date:
        query['timestamp'] = {}
        if start_date:
            try:
                from dateutil import parser
                query['timestamp']['$gte'] = parser.parse(start_date)
            except: query['timestamp']['$gte'] = datetime.fromisoformat(str(start_date))
        if end_date:
            try:
                from dateutil import parser
                query['timestamp']['$lte'] = parser.parse(end_date)
            except: query['timestamp']['$lte'] = datetime.fromisoformat(str(end_date))

    total = db.audit_logs.count_documents(query)
    logs = db.audit_logs.find(query).sort("timestamp", -1).skip(skip).limit(limit)

    formatted = []
    for log in logs:
        formatted.append({
            "id": str(log['_id']),
            "action": log.get('action'),
            "userId": str(log.get('userId')) if log.get('userId') else None,
            "username": log.get('username'),
            "timestamp": log.get('timestamp').isoformat() if isinstance(log.get('timestamp'), datetime) else str(log.get('timestamp')),
            "details": log.get('details'),
            "metadata": log.get('metadata')
        })

    return jsonify({
        "logs": formatted,
        "total": total,
        "page": (skip // limit) + 1,
        "pageSize": limit,
        "totalPages": (total + limit - 1) // limit
    })
