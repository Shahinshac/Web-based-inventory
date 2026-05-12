import logging
import bcrypt
import os
import shutil
from datetime import datetime, timedelta
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
    """Fetch all EMI plans for admin dashboard with safe data parsing."""
    try:
        db = get_db()
        
        # 1. Sync check (only for truly missing plans)
        # Instead of regex searching every request, we just look for 5 most recent EMI bills that might need plans
        recent_emi_bills = db.bills.find(
            {"paymentMode": {"$regex": "emi", "$options": "i"}},
            sort=[("createdAt", -1)]
        ).limit(10)
        
        from dateutil import parser
        from routes.emi import _sync_emi_plan_status
        
        def safe_float(val, default=0.0):
            try:
                return float(val or default)
            except (ValueError, TypeError):
                return float(default)

        for bill in recent_emi_bills:
            exists = db.emi_plans.find_one({"billId": bill["_id"]})
            if not exists:
                emi_details = bill.get("emiDetails", {})
                try:
                    months = int(emi_details.get('months', 0) or 0)
                except (ValueError, TypeError):
                    months = 0

                if months > 0:
                    emi_amt = safe_float(emi_details.get('emiAmount', 0))
                    bill_date = bill.get('billDate')
                    if isinstance(bill_date, str):
                        try:
                            bill_date = parser.parse(bill_date)
                        except:
                            bill_date = utc_now()
                    elif not bill_date:
                        bill_date = utc_now()

                    installments = []
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
                    
                    down_payment = safe_float(emi_details.get("downPayment", 0))
                    grand_total = safe_float(bill.get("grandTotal", 0))
                    
                    db.emi_plans.insert_one({
                        "billId": bill["_id"],
                        "billNumber": bill.get("billNumber"),
                        "customerId": bill.get("customerId"),
                        "customerName": bill.get("customerName"),
                        "customerPhone": bill.get("customerPhone"),
                        "totalAmount": grand_total,
                        "downPayment": down_payment,
                        "principalAmount": safe_float(emi_details.get("principalAmount"), grand_total - down_payment),
                        "monthlyEmi": safe_float(emi_details.get("emiAmount"), 0),
                        "tenure": months,
                        "interestRate": safe_float(emi_details.get("interestRate"), 0),
                        "startDate": bill_date,
                        "status": "active",
                        "installments": installments,
                        "createdAt": bill.get('createdAt', utc_now())
                    })

        # 2. Fetch plans
        plans_cursor = db.emi_plans.find().sort("createdAt", -1).limit(500)
        plans_list = []
        now = utc_now()
        
        for p in plans_cursor:
            try:
                # Sync status on the fly to ensure accuracy
                _sync_emi_plan_status(p, now=now)
                
                installments = p.get('installments', [])
                total_paid = sum(safe_float(inst.get('paidAmount', 0)) for inst in installments)
                
                plans_list.append({
                    "id": str(p['_id']),
                    "billNumber": p.get('billNumber') or "N/A",
                    "customerId": str(p.get('customerId')) if p.get('customerId') else None,
                    "customerName": p.get('customerName', 'N/A'),
                    "customerPhone": p.get('customerPhone', 'N/A'),
                    "totalAmount": safe_float(p.get('totalAmount', 0)),
                    "principalAmount": safe_float(p.get('principalAmount', 0)),
                    "downPayment": safe_float(p.get('downPayment', 0)),
                    "tenure": int(p.get('tenure', 0) or 0),
                    "monthlyEmi": safe_float(p.get('monthlyEmi', 0)),
                    "totalPaid": total_paid,
                    "status": p.get('status', 'active'),
                    "createdAt": to_iso_string(p.get('createdAt'))
                })
            except Exception as plan_err:
                logger.warning(f"Error processing EMI plan {p.get('_id')}: {plan_err}")
                continue
            
        return jsonify({"success": True, "emiPlans": plans_list}), 200
    except Exception as e:
        logger.error(f"Error fetching EMI plans: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Failed to fetch EMI plans", 
            "message": str(e),
            "emiPlans": []
        }), 500


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


# ==================== PAYMENT REQUESTS (ADMIN) ====================

@admin_bp.route('/payment-requests', methods=['GET'])
@authenticate_token
@require_admin
def get_all_payment_requests():
    """Get all payment requests for admin approval"""
    try:
        db = get_db()
        status = request.args.get('status', 'pending')
        query = {}
        if status != 'all':
            query['status'] = status

        requests = list(db.payment_requests.find(query).sort("createdAt", -1))
        
        for req in requests:
            req['_id'] = str(req['_id'])
            req['customerId'] = str(req['customerId'])
            req['targetId'] = str(req['targetId'])
            req['createdAt'] = to_iso_string(req.get('createdAt'))
            req['updatedAt'] = to_iso_string(req.get('updatedAt'))

        return jsonify({
            "success": True,
            "requests": requests
        })
    except Exception as e:
        logger.error(f"Fetch admin requests error: {e}")
        return jsonify({"error": "Failed to fetch requests"}), 500

@admin_bp.route('/payment-requests/<request_id>', methods=['PATCH'])
@authenticate_token
@require_admin
def handle_payment_request(request_id):
    """Approve or reject a payment request"""
    try:
        db = get_db()
        data = request.get_json()
        new_status = data.get('status') # 'approved' or 'rejected'
        admin_notes = data.get('notes', '')

        if new_status not in ['approved', 'rejected']:
            return jsonify({"error": "Invalid status"}), 400

        req = db.payment_requests.find_one({"_id": ObjectId(request_id)})
        if not req:
            return jsonify({"error": "Request not found"}), 404

        if req['status'] != 'pending':
            return jsonify({"error": "Request already processed"}), 400

        # If approved, perform the actual action
        if new_status == 'approved':
            if req['type'] == 'warranty_renewal':
                # Logic to renew warranty
                years = int(req.get('data', {}).get('years', 1))
                warranty_id = req['targetId']
                
                # Fetch warranty
                warranty = db.warranties.find_one({"_id": warranty_id})
                if warranty:
                    from utils.tzutils import utc_from_iso
                    current_expiry = utc_from_iso(warranty.get('expiryDate')) or utc_now()
                    new_expiry = current_expiry + timedelta(days=365 * years)
                    
                    db.warranties.update_one(
                        {"_id": warranty_id},
                        {
                            "$set": {
                                "expiryDate": new_expiry,
                                "status": "active",
                                "lastRenewalDate": utc_now()
                            },
                            "$push": {
                                "history": {
                                    "action": "renewal",
                                    "date": utc_now(),
                                    "years": years,
                                    "requestId": str(req['_id'])
                                }
                            }
                        }
                    )
            
            elif req['type'] == 'emi_payment':
                # Logic to record EMI payment
                emi_id = req['targetId']
                inst_no = int(req.get('data', {}).get('installmentNo', 0))
                paid_amount = float(req['amount'])
                
                emi_plan = db.emi_plans.find_one({"_id": emi_id})
                if emi_plan:
                    installments = emi_plan.get('installments', [])
                    for inst in installments:
                        if inst['installmentNo'] == inst_no:
                            inst['paidAmount'] = min(inst.get('paidAmount', 0) + paid_amount, inst['amount'])
                            inst['paidDate'] = utc_now()
                            inst['status'] = 'completed' if inst['paidAmount'] >= inst['amount'] else 'partial'
                            break
                    
                    all_paid = all(i['status'] == 'completed' for i in installments)
                    db.emi_plans.update_one(
                        {"_id": emi_id},
                        {
                            "$set": {
                                "installments": installments,
                                "status": "closed" if all_paid else "active",
                                "updatedAt": utc_now()
                            }
                        }
                    )

        # Update request status
        db.payment_requests.update_one(
            {"_id": ObjectId(request_id)},
            {
                "$set": {
                    "status": new_status,
                    "adminNotes": admin_notes,
                    "processedBy": g.user.get('userId'),
                    "updatedAt": utc_now()
                }
            }
        )

        log_audit(db, f"PAYMENT_REQUEST_{new_status.upper()}", str(req['customerId']), g.user.get('username'), {
            "requestId": request_id,
            "type": req['type']
        })

        return jsonify({
            "success": True,
            "message": f"Request {new_status} successfully"
        })

    except Exception as e:
        logger.error(f"Handle request error: {e}")
        return jsonify({"error": "Failed to process request"}), 500
