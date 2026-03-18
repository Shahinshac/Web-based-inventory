import logging
import re
from datetime import datetime
from bson import ObjectId
from flask import Blueprint, request, jsonify, g

from database import get_db
from utils.auth_middleware import authenticate_token
from services.audit_service import log_audit

logger = logging.getLogger(__name__)

returns_bp = Blueprint('returns', __name__)

@returns_bp.route('/', methods=['GET'])
@authenticate_token
def get_returns():
    db = get_db()
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    
    filter_q = {}
    if start_date or end_date:
        filter_q['createdAt'] = {}
        if start_date:
            try:
                from dateutil import parser
                filter_q['createdAt']['$gte'] = parser.parse(start_date)
            except: filter_q['createdAt']['$gte'] = datetime.fromisoformat(str(start_date))
        if end_date:
            try:
                from dateutil import parser
                filter_q['createdAt']['$lte'] = parser.parse(end_date)
            except: filter_q['createdAt']['$lte'] = datetime.fromisoformat(str(end_date))

    returns = db.returns.find(filter_q).sort("createdAt", -1)
    
    formatted = []
    for r in returns:
        formatted.append({
            "id": str(r['_id']),
            "invoiceId": r.get('invoiceId'),
            "billNumber": r.get('billNumber'),
            "customerName": r.get('customerName'),
            "items": r.get('items', []),
            "refundAmount": r.get('refundAmount'),
            "reason": r.get('reason'),
            "status": r.get('status'),
            "createdAt": r.get('createdAt').isoformat() if isinstance(r.get('createdAt'), datetime) else str(r.get('createdAt')),
            "processedBy": r.get('processedBy'),
            "processedByUsername": r.get('processedByUsername')
        })
        
    return jsonify(formatted)

@returns_bp.route('/lookup-invoice/<billNumber>', methods=['GET'])
@authenticate_token
def lookup_invoice(billNumber):
    db = get_db()
    regex = re.compile('^' + re.escape(billNumber) + '$', re.IGNORECASE)
    invoice = db.bills.find_one({"billNumber": {"$regex": regex}})
    
    if not invoice:
        return jsonify({"error": "Invoice not found"}), 404
        
    return jsonify({
        "id": str(invoice["_id"]),
        "billNumber": invoice.get("billNumber"),
        "customerName": invoice.get("customerName"),
        "customerPhone": invoice.get("customerPhone"),
        "billDate": invoice.get("billDate").isoformat() if isinstance(invoice.get("billDate"), datetime) else str(invoice.get("billDate")),
        "grandTotal": invoice.get("grandTotal"),
        "items": [{
            "productId": str(item.get("productId")) if item.get("productId") else None,
            "productName": item.get("productName"),
            "quantity": item.get("quantity"),
            "unitPrice": item.get("unitPrice"),
            "costPrice": item.get("costPrice", 0),
            "lineSubtotal": item.get("lineSubtotal")
        } for item in invoice.get("items", [])]
    })

@returns_bp.route('/', methods=['POST'])
@authenticate_token
def process_return():
    data = request.get_json()
    invoice_id = data.get('invoiceId')
    bill_number = data.get('billNumber', 'N/A')
    customer_name = data.get('customerName', 'Walk-in')
    items = data.get('items', [])
    refund_amount = float(data.get('refundAmount') or 0)
    reason = data.get('reason')
    
    user_id = g.user.get('userId')
    username = g.user.get('username', 'Unknown')
    
    if not items or len(items) == 0:
        return jsonify({"error": "At least one item is required for return"}), 400
    if not reason:
        return jsonify({"error": "Return reason is required"}), 400
        
    db = get_db()
    
    for item in items:
        pid = item.get('productId')
        if pid:
            try:
                db.products.update_one(
                    {"_id": ObjectId(pid)},
                    {"$inc": {"quantity": float(item.get('quantity', 0))}}
                )
            except: pass

    return_doc = {
        "invoiceId": invoice_id,
        "billNumber": bill_number,
        "customerName": customer_name,
        "items": [{
            "productId": i.get('productId'),
            "name": i.get('name', i.get('productName')),
            "quantity": float(i.get('quantity', 0)),
            "price": float(i.get('price', i.get('unitPrice', 0))),
            "total": float(i.get('quantity', 0)) * float(i.get('price', i.get('unitPrice', 0)))
        } for i in items],
        "refundAmount": refund_amount,
        "reason": reason,
        "status": 'completed',
        "createdAt": datetime.utcnow(),
        "processedBy": user_id,
        "processedByUsername": username
    }
    
    result = db.returns.insert_one(return_doc)
    
    log_audit(db, "RETURN_PROCESSED", user_id, username, {
        "returnId": str(result.inserted_id),
        "billNumber": bill_number,
        "refundAmount": refund_amount,
        "itemCount": len(items),
        "reason": reason
    })
    
    return_doc['id'] = str(result.inserted_id)
    return_doc['createdAt'] = return_doc['createdAt'].isoformat()
    if '_id' in return_doc: del return_doc['_id']
    
    return jsonify(return_doc)

@returns_bp.route('/<id>', methods=['DELETE'])
@authenticate_token
def delete_return(id):
    role = g.user.get('role')
    user_id = g.user.get('userId')
    username = g.user.get('username', 'Unknown')
    
    if role not in ['admin', 'manager', 'superadmin']:
        return jsonify({"error": "Only admins and managers can delete return records"}), 403
        
    db = get_db()
    try:
        return_doc = db.returns.find_one({"_id": ObjectId(id)})
    except: return jsonify({"error": "Invalid return ID"}), 400
    
    if not return_doc:
        return jsonify({"error": "Return record not found"}), 404
        
    for item in return_doc.get('items', []):
        pid = item.get('productId')
        if pid:
            try:
                db.products.update_one(
                    {"_id": ObjectId(pid)},
                    {"$inc": {"quantity": -float(item.get('quantity', 0))}}
                )
            except: pass
            
    db.returns.delete_one({"_id": ObjectId(id)})
    
    log_audit(db, "RETURN_DELETED", user_id, username, {
        "returnId": id,
        "billNumber": return_doc.get('billNumber'),
        "refundAmount": return_doc.get('refundAmount'),
        "reason": return_doc.get('reason')
    })
    
    return jsonify({"success": True, "id": id})

@returns_bp.route('/stats', methods=['GET'])
@authenticate_token
def get_return_stats():
    db = get_db()
    
    total_returns = db.returns.count_documents({})
    
    refund_cursor = db.returns.aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$refundAmount"}}}
    ])
    refund_list = list(refund_cursor)
    total_refunded = refund_list[0]['total'] if refund_list else 0
    
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_returns = db.returns.count_documents({"createdAt": {"$gte": today}})
    
    month_start = today.replace(day=1)
    month_cursor = db.returns.aggregate([
        {"$match": {"createdAt": {"$gte": month_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$refundAmount"}, "count": {"$sum": 1}}}
    ])
    month_list = list(month_cursor)
    
    return jsonify({
        "totalReturns": total_returns,
        "totalRefunded": total_refunded,
        "todayReturns": today_returns,
        "monthReturns": month_list[0]['count'] if month_list else 0,
        "monthRefunded": month_list[0]['total'] if month_list else 0
    })
