import logging
from datetime import datetime
from bson import ObjectId
from flask import Blueprint, request, jsonify, g

from database import get_db
from utils.auth_middleware import authenticate_token, require_admin
from services.audit_service import log_audit
from utils.tzutils import utc_now, to_iso_string

logger = logging.getLogger(__name__)

employees_bp = Blueprint('employees', __name__)

@employees_bp.route('/', methods=['GET'])
@authenticate_token
def get_employees():
    """Get all employees"""
    db = get_db()
    employees = list(db.employees.find().sort("_id", -1))

    formatted = []
    for emp in employees:
        formatted.append({
            "id": str(emp['_id']),
            "name": emp.get('name'),
            "role": emp.get('role'),
            "salaryAmount": emp.get('salary_amount'),
            "salaryDay": emp.get('salary_day', 1),
            "isActive": emp.get('is_active', True),
            "userId": str(emp.get('user_id')) if emp.get('user_id') else None,
            "createdAt": emp.get('created_at').isoformat() if emp.get('created_at') else None
        })

    return jsonify(formatted)

@employees_bp.route('/', methods=['POST'])
@authenticate_token
@require_admin
def create_employee():
    """Create a new employee"""
    data = request.get_json()
    name = data.get('name', '').strip()
    role = data.get('role', 'cashier')
    salary_amount = data.get('salaryAmount')
    salary_day = data.get('salaryDay', 1)
    user_id = data.get('userId')

    if not name or salary_amount is None:
        return jsonify({"error": "Name and salary amount are required"}), 400

    try:
        salary_amount = float(salary_amount)
        salary_day = int(salary_day)
    except (ValueError, TypeError):
        return jsonify({"error": "Salary amount and day must be valid numbers"}), 400

    if salary_day < 1 or salary_day > 31:
        return jsonify({"error": "Salary day must be between 1 and 31"}), 400

    db = get_db()

    employee = {
        "name": name,
        "role": role,
        "salary_amount": salary_amount,
        "salary_day": salary_day,
        "user_id": ObjectId(user_id) if user_id else None,
        "is_active": True,
        "created_at": utc_now(),
        "created_by": g.user.get('userId'),
        "created_by_username": g.user.get('username')
    }

    result = db.employees.insert_one(employee)

    log_audit(db, "EMPLOYEE_CREATED", g.user.get('userId'), g.user.get('username'), {
        "employeeId": str(result.inserted_id),
        "name": name,
        "role": role,
        "salaryAmount": salary_amount
    })

    return jsonify({
        "success": True,
        "message": f"Employee '{name}' created successfully",
        "employee": {
            "id": str(result.inserted_id),
            "name": name,
            "role": role,
            "salaryAmount": salary_amount,
            "salaryDay": salary_day,
            "isActive": True
        }
    }), 201

@employees_bp.route('/<employee_id>', methods=['PUT'])
@authenticate_token
@require_admin
def update_employee(employee_id):
    """Update employee details"""
    try:
        emp_id = ObjectId(employee_id)
    except:
        return jsonify({"error": "Invalid employee ID"}), 400

    data = request.get_json()

    db = get_db()
    employee = db.employees.find_one({"_id": emp_id})

    if not employee:
        return jsonify({"error": "Employee not found"}), 404

    update_fields = {}

    if 'name' in data:
        update_fields['name'] = data['name'].strip()

    if 'role' in data:
        update_fields['role'] = data['role']

    if 'salaryAmount' in data:
        try:
            update_fields['salary_amount'] = float(data['salaryAmount'])
        except ValueError:
            return jsonify({"error": "Invalid salary amount"}), 400

    if 'salaryDay' in data:
        try:
            salary_day = int(data['salaryDay'])
            if salary_day < 1 or salary_day > 31:
                return jsonify({"error": "Salary day must be between 1 and 31"}), 400
            update_fields['salary_day'] = salary_day
        except ValueError:
            return jsonify({"error": "Invalid salary day"}), 400

    if 'isActive' in data:
        update_fields['is_active'] = bool(data['isActive'])

    update_fields['updated_at'] = utc_now()
    update_fields['updated_by'] = g.user.get('userId')

    db.employees.update_one({"_id": emp_id}, {"$set": update_fields})

    log_audit(db, "EMPLOYEE_UPDATED", g.user.get('userId'), g.user.get('username'), {
        "employeeId": employee_id,
        "updates": update_fields
    })

    return jsonify({
        "success": True,
        "message": "Employee updated successfully"
    })

@employees_bp.route('/<employee_id>', methods=['DELETE'])
@authenticate_token
@require_admin
def delete_employee(employee_id):
    """Deactivate employee (soft delete)"""
    try:
        emp_id = ObjectId(employee_id)
    except:
        return jsonify({"error": "Invalid employee ID"}), 400

    db = get_db()
    employee = db.employees.find_one({"_id": emp_id})

    if not employee:
        return jsonify({"error": "Employee not found"}), 404

    # Soft delete - mark as inactive
    db.employees.update_one(
        {"_id": emp_id},
        {"$set": {
            "is_active": False,
            "deactivated_at": utc_now(),
            "deactivated_by": g.user.get('userId')
        }}
    )

    log_audit(db, "EMPLOYEE_DEACTIVATED", g.user.get('userId'), g.user.get('username'), {
        "employeeId": employee_id,
        "name": employee.get('name')
    })

    return jsonify({
        "success": True,
        "message": "Employee deactivated successfully"
    })

@employees_bp.route('/<employee_id>/salary-history', methods=['GET'])
@authenticate_token
def get_salary_history(employee_id):
    """Get salary expense history for an employee"""
    try:
        emp_id = ObjectId(employee_id)
    except:
        return jsonify({"error": "Invalid employee ID"}), 400

    db = get_db()
    employee = db.employees.find_one({"_id": emp_id})

    if not employee:
        return jsonify({"error": "Employee not found"}), 404

    # Get all salary expenses for this employee
    salary_expenses = list(db.expenses.find({
        "employee_id": emp_id,
        "category": "salary"
    }).sort("date", -1))

    formatted = []
    for exp in salary_expenses:
        formatted.append({
            "id": str(exp['_id']),
            "amount": exp.get('amount'),
            "date": exp.get('date').isoformat() if exp.get('date') else None,
            "description": exp.get('description'),
            "autoGenerated": exp.get('autoGenerated', True)
        })

    return jsonify({
        "employee": {
            "id": str(emp_id),
            "name": employee.get('name'),
            "salaryAmount": employee.get('salary_amount')
        },
        "salaryHistory": formatted
    })
