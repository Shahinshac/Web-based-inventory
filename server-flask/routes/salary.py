import logging
from flask import Blueprint, jsonify, g

from utils.auth_middleware import authenticate_token, require_admin
from services.salary_scheduler import process_monthly_salaries, get_salary_summary

logger = logging.getLogger(__name__)

salary_bp = Blueprint('salary', __name__)

@salary_bp.route('/process-monthly', methods=['POST'])
@authenticate_token
@require_admin
def process_monthly():
    """
    Manually trigger monthly salary processing.
    Normally this would be called by a cron job.
    """
    result = process_monthly_salaries()
    return jsonify(result)

@salary_bp.route('/summary', methods=['GET'])
@authenticate_token
@require_admin
def get_summary():
    """Get salary payment summary for all employees"""
    summary = get_salary_summary()
    return jsonify(summary)

@salary_bp.route('/summary/<employee_id>', methods=['GET'])
@authenticate_token
def get_employee_summary(employee_id):
    """Get salary payment summary for a specific employee"""
    summary = get_salary_summary(employee_id)
    if "error" in summary:
        return jsonify(summary), 404
    return jsonify(summary)
