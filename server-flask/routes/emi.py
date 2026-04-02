import logging
from datetime import datetime, timedelta
from bson import ObjectId
from flask import Blueprint, request, jsonify, g
from database import get_db
from utils.auth_middleware import authenticate_token, require_customer
from services.audit_service import log_audit
from utils.tzutils import utc_now, to_iso_string

logger = logging.getLogger(__name__)

emi_bp = Blueprint('emi', __name__)

# Constants
EMI_TENURES = [3, 6, 12, 24]  # months
EMI_INTEREST_PERCENT = 0  # Zero interest EMI
EMI_MIN_AMOUNT = 5000  # Minimum amount to offer EMI

@emi_bp.route('/', methods=['POST'])
@authenticate_token
def create_emi():
    """Create a new EMI plan during checkout."""
    data = request.get_json()

    # Validate required fields
    required_fields = ['billId', 'customerId', 'amount', 'tenure']
    for field in required_fields:
        if field not in data or data[field] is None:
            return jsonify({"error": f"Missing required field: {field}"}), 400

    try:
        bill_id = ObjectId(data['billId'])
        customer_id = ObjectId(data['customerId'])
        total_amount = float(data['amount'])
        down_payment = float(data.get('downPayment', 0))  # Can be 0 or higher
        tenure = int(data['tenure'])
    except (ValueError, TypeError) as e:
        return jsonify({"error": f"Invalid data format: {str(e)}"}), 400

    # Validate down payment
    if down_payment < 0:
        return jsonify({"error": "Down payment cannot be negative"}), 400
    
    if down_payment >= total_amount:
        return jsonify({"error": "Down payment must be less than total amount"}), 400

    # Calculate principal amount (amount to be financed via EMI)
    principal_amount = total_amount - down_payment

    # Validate tenure
    if tenure not in EMI_TENURES:
        return jsonify({"error": f"Invalid tenure. Allowed: {EMI_TENURES}"}), 400

    # Validate EMI amount (not total amount)
    if principal_amount < EMI_MIN_AMOUNT:
        return jsonify({"error": f"EMI principal amount (after down payment) must be at least ₹{EMI_MIN_AMOUNT}"}), 400

    db = get_db()

    # Check if customer exists
    customer = db.customers.find_one({"_id": customer_id})
    if not customer:
        return jsonify({"error": "Customer not found"}), 404

    # Check if bill exists
    bill = db.bills.find_one({"_id": bill_id})
    if not bill:
        return jsonify({"error": "Bill not found"}), 404

    # Calculate EMI with 0% interest
    # Monthly amount = Principal / Tenure months
    monthly_emi = round(principal_amount / tenure, 2)
    last_emi = round(principal_amount - (monthly_emi * (tenure - 1)), 2)

    # Generate installments
    installments = []
    start_date = utc_now()

    for i in range(tenure):
        due_date = start_date + timedelta(days=30 * (i + 1))
        amount = last_emi if i == tenure - 1 else monthly_emi

        installments.append({
            "installmentNo": i + 1,
            "dueDate": due_date,
            "amount": amount,
            "paidAmount": 0,
            "status": "pending",  # pending, partial, paid
            "paidDate": None,
            "paymentMethod": None,
            "notes": None
        })

    # Create EMI plan document
    emi_plan = {
        "billId": bill_id,
        "customerId": customer_id,
        "customerName": customer.get('name'),
        "customerPhone": customer.get('phone'),
        "totalAmount": total_amount,  # Total bill amount
        "downPayment": down_payment,  # Down payment amount (can be 0)
        "principalAmount": principal_amount,  # Amount to be financed
        "tenure": tenure,
        "monthlyEmi": monthly_emi,
        "totalInterest": 0,  # Zero interest
        "startDate": start_date,
        "endDate": start_date + timedelta(days=30 * tenure),
        "status": "active",  # active, closed, defaulted
        "installments": installments,
        "createdBy": g.user.get('userId'),
        "createdAt": utc_now(),
        "updatedAt": utc_now(),
        "notes": data.get('notes', '')
    }

    # Insert EMI plan
    result = db.emi_plans.insert_one(emi_plan)
    emi_plan['_id'] = result.inserted_id

    # Update bill with EMI reference
    db.bills.update_one(
        {"_id": bill_id},
        {"$set": {
            "emiPlanId": result.inserted_id,
            "emiEnabled": True,
            "emiDownPayment": down_payment,
            "emiTotalAmount": total_amount,
            "emiMonthlyAmount": monthly_emi,
            "emiTenure": tenure,
            "updatedAt": utc_now()
        }}
    )

    # Log audit
    log_audit(
        action="create_emi",
        entity="EMI Plan",
        entity_id=str(result.inserted_id),
        details=f"Created EMI plan for bill {bill.get('billNumber')} - {tenure} months, Down payment: ₹{down_payment}"
    )

    down_payment_msg = f" (Down payment: ₹{down_payment})" if down_payment > 0 else ""
    return jsonify({
        "success": True,
        "emiPlanId": str(result.inserted_id),
        "message": f"EMI plan created: {tenure} months @ ₹{monthly_emi}/month{down_payment_msg}",
        "emiPlan": {
            "_id": str(emi_plan['_id']),
            "totalAmount": total_amount,
            "downPayment": down_payment,
            "principalAmount": principal_amount,
            "monthlyEmi": monthly_emi,
            "tenure": tenure,
            "startDate": start_date.isoformat(),
            "endDate": (start_date + timedelta(days=30 * tenure)).isoformat()
        }
    }), 201


@emi_bp.route('/<emi_id>', methods=['GET'])
@authenticate_token
def get_emi(emi_id):
    """Get detailed EMI plan."""
    try:
        emi_id_obj = ObjectId(emi_id)
    except ValueError:
        return jsonify({"error": "Invalid EMI ID"}), 400

    db = get_db()
    emi_plan = db.emi_plans.find_one({"_id": emi_id_obj})

    if not emi_plan:
        return jsonify({"error": "EMI plan not found"}), 404

    emi_plan['_id'] = str(emi_plan['_id'])
    emi_plan['billId'] = str(emi_plan['billId'])
    emi_plan['customerId'] = str(emi_plan['customerId'])
    emi_plan['startDate'] = emi_plan['startDate'].isoformat()
    emi_plan['endDate'] = emi_plan['endDate'].isoformat()
    emi_plan['createdAt'] = emi_plan['createdAt'].isoformat()
    emi_plan['updatedAt'] = emi_plan['updatedAt'].isoformat()

    # Format installments
    for inst in emi_plan['installments']:
        inst['dueDate'] = inst['dueDate'].isoformat()
        if inst['paidDate']:
            inst['paidDate'] = inst['paidDate'].isoformat()

    return jsonify(emi_plan), 200


@emi_bp.route('/customer/<customer_id>', methods=['GET'])
@authenticate_token
def get_customer_emi_plans(customer_id):
    """Get all EMI plans for a customer."""
    try:
        customer_id_obj = ObjectId(customer_id)
    except ValueError:
        return jsonify({"error": "Invalid customer ID"}), 400

    db = get_db()

    # Get pagination params
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))
    status = request.args.get('status')  # active, closed, defaulted

    skip = (page - 1) * limit

    # Build query
    query = {"customerId": customer_id_obj}
    if status:
        query['status'] = status

    # Get EMI plans
    emi_plans = list(db.emi_plans.find(query).sort("createdAt", -1).skip(skip).limit(limit))
    total = db.emi_plans.count_documents(query)

    # Format response
    for plan in emi_plans:
        plan['_id'] = str(plan['_id'])
        plan['billId'] = str(plan['billId'])
        plan['customerId'] = str(plan['customerId'])
        plan['startDate'] = plan['startDate'].isoformat()
        plan['endDate'] = plan['endDate'].isoformat()
        plan['createdAt'] = plan['createdAt'].isoformat()
        plan['updatedAt'] = plan['updatedAt'].isoformat()

        # Calculate summary stats
        total_paid = sum(inst['paidAmount'] for inst in plan['installments'])
        pending_installments = [inst for inst in plan['installments'] if inst['status'] in ['pending', 'partial']]

        plan['summary'] = {
            "totalPaid": total_paid,
            "totalPending": plan['principalAmount'] - total_paid,
            "nextDueDate": pending_installments[0]['dueDate'].isoformat() if pending_installments else None,
            "nextDueAmount": pending_installments[0]['amount'] if pending_installments else 0,
            "completedInstallments": len([i for i in plan['installments'] if i['status'] == 'paid']),
            "totalInstallments": len(plan['installments'])
        }

        # Format installments
        for inst in plan['installments']:
            inst['dueDate'] = inst['dueDate'].isoformat()
            if inst['paidDate']:
                inst['paidDate'] = inst['paidDate'].isoformat()

    return jsonify({
        "success": True,
        "data": emi_plans,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    }), 200


@emi_bp.route('/<emi_id>/payment', methods=['PATCH'])
@authenticate_token
def record_emi_payment(emi_id):
    """Record payment for an EMI installment."""
    try:
        emi_id_obj = ObjectId(emi_id)
    except ValueError:
        return jsonify({"error": "Invalid EMI ID"}), 400

    data = request.get_json()

    # Validate required fields
    if 'installmentNo' not in data or 'amount' not in data:
        return jsonify({"error": "Missing installmentNo or amount"}), 400

    installment_no = int(data['installmentNo'])
    paid_amount = float(data['amount'])
    payment_method = data.get('paymentMethod', 'unknown')
    notes = data.get('notes', '')

    db = get_db()
    emi_plan = db.emi_plans.find_one({"_id": emi_id_obj})

    if not emi_plan:
        return jsonify({"error": "EMI plan not found"}), 404

    # Find installment
    installment_idx = None
    for idx, inst in enumerate(emi_plan['installments']):
        if inst['installmentNo'] == installment_no:
            installment_idx = idx
            break

    if installment_idx is None:
        return jsonify({"error": "Installment not found"}), 404

    installment = emi_plan['installments'][installment_idx]
    due_amount = installment['amount']

    # Validate amount
    if paid_amount > due_amount:
        return jsonify({"error": f"Payment exceeds due amount (₹{due_amount})"}), 400

    # Update installment
    installment['paidAmount'] = min(installment['paidAmount'] + paid_amount, due_amount)
    installment['paidDate'] = utc_now()
    installment['paymentMethod'] = payment_method
    installment['notes'] = notes

    if installment['paidAmount'] >= due_amount:
        installment['status'] = 'paid'
    else:
        installment['status'] = 'partial'

    # Check if all installments are paid
    all_paid = all(inst['status'] == 'paid' for inst in emi_plan['installments'])
    new_status = 'closed' if all_paid else 'active'

    # Update EMI plan
    db.emi_plans.update_one(
        {"_id": emi_id_obj},
        {"$set": {
            "installments": emi_plan['installments'],
            "status": new_status,
            "updatedAt": utc_now()
        }}
    )

    # Log audit
    log_audit(
        action="emi_payment",
        entity="EMI Payment",
        entity_id=str(emi_id_obj),
        details=f"Installment {installment_no} payment: ₹{paid_amount}"
    )

    return jsonify({
        "success": True,
        "message": f"Payment recorded for installment {installment_no}",
        "installment": {
            "installmentNo": installment['installmentNo'],
            "status": installment['status'],
            "paidAmount": installment['paidAmount'],
            "paidDate": installment['paidDate'].isoformat()
        },
        "emiStatus": new_status
    }), 200


@emi_bp.route('/<emi_id>/status', methods=['PATCH'])
@authenticate_token
def update_emi_status(emi_id):
    """Update EMI plan status (admin only)."""
    try:
        emi_id_obj = ObjectId(emi_id)
    except ValueError:
        return jsonify({"error": "Invalid EMI ID"}), 400

    # Check if user is admin
    user_role = g.user.get('role', '').lower()
    if user_role != 'admin':
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    new_status = data.get('status', 'active')

    # Validate status
    if new_status not in ['active', 'closed', 'defaulted']:
        return jsonify({"error": "Invalid status"}), 400

    db = get_db()
    result = db.emi_plans.update_one(
        {"_id": emi_id_obj},
        {"$set": {
            "status": new_status,
            "updatedAt": utc_now()
        }}
    )

    if result.matched_count == 0:
        return jsonify({"error": "EMI plan not found"}), 404

    # Log audit
    log_audit(
        action="update_emi_status",
        entity="EMI Plan",
        entity_id=str(emi_id_obj),
        details=f"Status changed to: {new_status}"
    )

    return jsonify({
        "success": True,
        "message": f"EMI status updated to: {new_status}"
    }), 200
