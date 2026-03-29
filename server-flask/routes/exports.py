import csv
import io
import logging
from datetime import datetime
from flask import Blueprint, request, send_file, jsonify
from database import get_db
from utils.auth_middleware import authenticate_token

logger = logging.getLogger(__name__)

exports_bp = Blueprint('exports', __name__)

@exports_bp.route('/products', methods=['GET'])
@authenticate_token
def export_products():
    """Export all products to CSV"""
    db = get_db()
    products = list(db.products.find().sort("name", 1))
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header row
    writer.writerow(['Product Name', 'Category', 'Price (Inclusive)', 'Cost Price', 'Stock Quantity', 'HSN/SKU', 'Status'])
    
    for p in products:
        writer.writerow([
            p.get('name', 'N/A'),
            p.get('category', 'General'),
            p.get('price', 0),
            p.get('costPrice', 0),
            p.get('quantity', 0),
            p.get('hsnCode', 'N/A'),
            'In Stock' if p.get('quantity', 0) > 0 else 'Out of Stock'
        ])
    
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8')),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f"products_export_{datetime.now().strftime('%Y%m%d')}.csv"
    )

@exports_bp.route('/customers', methods=['GET'])
@authenticate_token
def export_customers():
    """Export all customers to CSV"""
    db = get_db()
    customers = list(db.customers.find().sort("name", 1))
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header row
    writer.writerow(['Name', 'Phone', 'Email', 'Address', 'Place', 'City', 'GSTIN', 'Member Since'])
    
    for c in customers:
        created_at = c.get('createdAt')
        date_str = created_at.strftime('%Y-%m-%d') if isinstance(created_at, datetime) else 'N/A'
        
        writer.writerow([
            c.get('name', 'N/A'),
            c.get('phone', 'N/A'),
            c.get('email', 'N/A'),
            c.get('address', 'N/A'),
            c.get('place', 'N/A'),
            c.get('city', 'N/A'),
            c.get('gstin', 'N/A'),
            date_str
        ])
    
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8')),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f"customers_export_{datetime.now().strftime('%Y%m%d')}.csv"
    )

@exports_bp.route('/invoices', methods=['GET'])
@authenticate_token
def export_invoices():
    """Export invoice history to CSV with date range filtering"""
    db = get_db()
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    
    query = {}
    if start_date or end_date:
        query['billDate'] = {}
        if start_date:
            query['billDate']['$gte'] = datetime.strptime(start_date, '%Y-%m-%d')
        if end_date:
            # End of day for the end_date
            query['billDate']['$lte'] = datetime.strptime(end_date, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
            
    bills = list(db.bills.find(query).sort("billDate", -1))
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header row
    writer.writerow(['Invoice No', 'Date', 'Customer Name', 'Subtotal', 'Tax (GST)', 'Grand Total', 'Profit', 'Payment Mode'])
    
    for b in bills:
        bill_date = b.get('billDate')
        date_str = bill_date.strftime('%Y-%m-%d %H:%M') if isinstance(bill_date, datetime) else str(bill_date)
        
        writer.writerow([
            b.get('billNumber', 'N/A'),
            date_str,
            b.get('customerName', 'Walk-in'),
            round(b.get('subtotal', 0), 2),
            round(b.get('gstAmount', 0), 2),
            round(b.get('grandTotal', 0), 2),
            round(b.get('totalProfit', 0), 2),
            b.get('paymentMode', 'cash')
        ])
    
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8')),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f"invoices_export_{datetime.now().strftime('%Y%m%d')}.csv"
    )

@exports_bp.route('/expenses', methods=['GET'])
@authenticate_token
def export_expenses():
    """Export business expenses to CSV"""
    db = get_db()
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    
    query = {}
    if start_date or end_date:
        query['date'] = {}
        if start_date:
            query['date']['$gte'] = datetime.strptime(start_date, '%Y-%m-%d')
        if end_date:
            query['date']['$lte'] = datetime.strptime(end_date, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
            
    expenses = list(db.expenses.find(query).sort("date", -1))
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header row
    writer.writerow(['Date', 'Description', 'Category', 'Amount', 'Mode'])
    
    for e in expenses:
        exp_date = e.get('date')
        date_str = exp_date.strftime('%Y-%m-%d') if isinstance(exp_date, datetime) else str(exp_date)
        
        writer.writerow([
            date_str,
            e.get('description', 'N/A'),
            e.get('category', 'General'),
            round(e.get('amount', 0), 2),
            e.get('mode', 'cash')
        ])
    
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8')),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f"expenses_export_{datetime.now().strftime('%Y%m%d')}.csv"
    )

@exports_bp.route('/returns', methods=['GET'])
@authenticate_token
def export_returns():
    """Export product returns to CSV"""
    db = get_db()
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    
    query = {}
    if start_date or end_date:
        query['returnDate'] = {}
        if start_date:
            query['returnDate']['$gte'] = datetime.strptime(start_date, '%Y-%m-%d')
        if end_date:
            query['returnDate']['$lte'] = datetime.strptime(end_date, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
            
    returns = list(db.returns.find(query).sort("returnDate", -1))
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header row
    writer.writerow(['Return ID', 'Date', 'Invoice No', 'Product Name', 'Quantity', 'Refund Amount', 'Reason'])
    
    for r in returns:
        return_date = r.get('returnDate')
        date_str = return_date.strftime('%Y-%m-%d') if isinstance(return_date, datetime) else str(return_date)
        
        writer.writerow([
            str(r.get('_id')),
            date_str,
            r.get('billNumber', 'N/A'),
            r.get('productName', 'N/A'),
            r.get('quantity', 0),
            round(r.get('refundAmount', 0), 2),
            r.get('reason', 'N/A')
        ])
    
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8')),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f"returns_export_{datetime.now().strftime('%Y%m%d')}.csv"
    )
