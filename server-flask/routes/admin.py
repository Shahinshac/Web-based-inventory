import logging
import bcrypt
import os
import shutil
from datetime import datetime
from bson import ObjectId
from flask import Blueprint, request, jsonify, g, current_app

from database import get_db
from utils.auth_middleware import authenticate_token, require_admin
from services.audit_service import log_audit
from utils.constants import ALLOW_ADMIN_PASSWORD_CHANGE
from utils.tzutils import utc_now, to_iso_string

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
    # Comprehensive collection list - all business data
    collections_to_clear = [
        'products', 'customers', 'bills', 'invoices', 'expenses',
        'audit_logs', 'product_images', 'user_images', 'returns',
        'public_invoice_links', 'public_customer_cards', 'notifications',
        'categories', 'warranties', 'payment_links', 'otp_codes',
        'emi_plans', 'employees'  # Added missing collections
    ]

    for coll in collections_to_clear:
        try:
            res = getattr(db, coll).delete_many({})
            results[coll] = res.deleted_count
        except Exception as e:
            results[coll] = 0
            logger.warning(f"Failed to clear {coll}: {e}")

    try:
        usr_res = db.users.delete_many({"role": {"$ne": "admin"}})
        results['users_non_admin'] = usr_res.deleted_count
    except Exception as e:
        results['users_non_admin'] = 0
        logger.warning(f"Failed to clear non-admin users: {e}")

    total = sum(results.values())

    log_audit(db, "ADMIN_CLEAR_DATABASE", str(admin["_id"]), admin["username"], results)

    return jsonify({
        "success": True,
        "message": "All data cleared successfully",
        "results": results,
        "total": total,
        "timestamp": to_iso_string(utc_now())
    })

@admin_bp.route('/wipe-data', methods=['DELETE'])
@authenticate_token
@require_admin
def wipe_data():
    """
    Comprehensive data wipe endpoint.
    Removes all business data while preserving admin users.
    Requires admin authentication.
    """
    try:
        user_id = g.user.get('userId')
        username = g.user.get('username', 'Unknown')

        db = get_db()

        # All business data collections to wipe
        wipe_results = {}
        collections_to_wipe = [
            'products', 'customers', 'bills', 'expenses',
            'returns', 'warranties', 'emi_plans', 'payment_links',
            'public_invoice_links', 'public_customer_cards', 'otp_codes',
            'product_images', 'user_images', 'notifications', 'categories'
        ]

        # Wipe each collection completely
        for collection_name in collections_to_wipe:
            try:
                coll = getattr(db, collection_name)
                result = coll.delete_many({})
                wipe_results[collection_name] = {
                    "deleted": result.deleted_count,
                    "status": "success"
                }
                logger.info(f"Wiped {collection_name}: {result.deleted_count} records deleted")
            except Exception as e:
                wipe_results[collection_name] = {
                    "deleted": 0,
                    "status": "failed",
                    "error": str(e)
                }
                logger.warning(f"Failed to wipe {collection_name}: {e}")

        # Delete non-admin users (preserve admin users)
        try:
            usr_result = db.users.delete_many({"role": {"$ne": "admin"}})
            wipe_results['users_non_admin'] = {
                "deleted": usr_result.deleted_count,
                "status": "success"
            }
            logger.info(f"Deleted non-admin users: {usr_result.deleted_count}")
        except Exception as e:
            wipe_results['users_non_admin'] = {
                "deleted": 0,
                "status": "failed",
                "error": str(e)
            }
            logger.warning(f"Failed to delete non-admin users: {e}")

        # Clear audit logs (after logging this action)
        try:
            audit_result = db.audit_logs.delete_many({})
            wipe_results['audit_logs'] = {
                "deleted": audit_result.deleted_count,
                "status": "success"
            }
        except Exception as e:
            wipe_results['audit_logs'] = {
                "deleted": 0,
                "status": "failed",
                "error": str(e)
            }

        # Count total records wiped
        total_wiped = sum(
            r.get('deleted', 0) for r in wipe_results.values()
            if isinstance(r, dict)
        )

        # Verify admin users still exist
        admin_count = db.users.count_documents({"role": "admin"})

        response = {
            "success": True,
            "message": f"Successfully wiped all data. {total_wiped} records deleted across {len(wipe_results)} collections.",
            "details": wipe_results,
            "stats": {
                "total_records_deleted": total_wiped,
                "collections_wiped": len([r for r in wipe_results.values() if isinstance(r, dict) and r.get('status') == 'success']),
                "admin_users_preserved": admin_count
            },
            "timestamp": to_iso_string(utc_now())
        }

        # Log this critical action
        try:
            log_audit(db, "ADMIN_WIPE_DATA", str(user_id), username, {
                "total_deleted": total_wiped,
                "collections": len(collections_to_wipe),
                "results": {k: v.get('deleted', 0) for k, v in wipe_results.items()}
            })
        except Exception as e:
            logger.warning(f"Could not log wipe action: {e}")

        return jsonify(response), 200

    except Exception as e:
        logger.error(f"Wipe data error: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Data wipe failed",
            "message": str(e) if current_app.config.get('DEBUG') else "An error occurred during wipe"
        }), 500


@admin_bp.route('/emi-plans', methods=['GET'])
@authenticate_token
@require_admin
def get_all_emi_plans():
    """Fetch all EMI plans for admin dashboard."""
    try:
        db = get_db()
        
        # Fallback Sync: Find bills with EMI that don't have a plan record yet
        # (This helps populate the list with historical data)
        emi_bills = db.bills.find({"paymentMode": "emi"})
        for bill in emi_bills:
            exists = db.emi_plans.find_one({"billId": bill["_id"]})
            if not exists:
                # Auto-create missing plan
                emi_details = bill.get("emiDetails", {})
                installments = []
                months = int(emi_details.get('months', 0))
                if months > 0:
                    emi_amt = float(emi_details.get('emiAmount', 0))
                    bill_date = bill.get('billDate', utc_now())
                    for m in range(1, months + 1):
                        due_date = bill_date + timedelta(days=30 * m)
                        installments.append({
                            "installmentNo": m,
                            "dueDate": due_date,
                            "amount": emi_amt,
                            "status": "pending",
                            "paidAmount": 0,
                            "paidDate": None
                        })
                
                db.emi_plans.insert_one({
                    "billId": bill["_id"],
                    "billNumber": bill.get("billNumber"),
                    "customerId": bill.get("customerId"),
                    "customerName": bill.get("customerName"),
                    "customerPhone": bill.get("customerPhone"),
                    "totalAmount": bill.get("grandTotal"),
                    "downPayment": float(emi_details.get("downPayment", 0)),
                    "principalAmount": float(emi_details.get("principalAmount", bill.get("grandTotal", 0) - float(emi_details.get("downPayment", 0)))),
                    "monthlyEmi": float(emi_details.get("emiAmount", 0)),
                    "tenure": months,
                    "interestRate": float(emi_details.get("interestRate", 0)),
                    "startDate": bill_date,
                    "status": "active",
                    "installments": installments,
                    "createdAt": bill.get('createdAt', utc_now())
                })

        # Fetch all plans, newest first
        plans_cursor = db.emi_plans.find().sort("createdAt", -1).limit(500)
        
        plans_list = []
        for p in plans_cursor:
            # Calculate basic stats for each plan
            installments = p.get('installments', [])
            total_paid = sum(inst.get('paidAmount', 0) for inst in installments)
            
            plans_list.append({
                "id": str(p['_id']),
                "_id": str(p['_id']),
                "billNumber": p.get('billNumber') or "N/A", # Will need to lookup from bills if missing, but emi_plans usually has it
                "customerId": str(p.get('customerId')),
                "customerName": p.get('customerName', 'N/A'),
                "customerPhone": p.get('customerPhone', 'N/A'),
                "totalAmount": p.get('totalAmount', 0),
                "principalAmount": p.get('principalAmount', 0),
                "downPayment": p.get('downPayment', 0),
                "tenure": p.get('tenure', 0),
                "monthlyEmi": p.get('monthlyEmi', 0),
                "totalPaid": total_paid,
                "status": p.get('status', 'active'),
                "createdAt": to_iso_string(p.get('createdAt'))
            })
            
        return jsonify({
            "success": True,
            "emiPlans": plans_list
        }), 200
    except Exception as e:
        logger.error(f"Error fetching EMI plans: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to fetch EMI plans", "message": str(e)}), 500


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
            "timestamp": to_iso_string(log.get('timestamp')),
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
