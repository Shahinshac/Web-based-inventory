import logging
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify

from database import get_db
from utils.auth_middleware import authenticate_token

logger = logging.getLogger(__name__)

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/stats', methods=['GET'])
@authenticate_token
def get_stats():
    db = get_db()

    product_count = db.products.count_documents({})
    customer_count = db.customers.count_documents({})

    # Revenue should be afterDiscount (excluding GST, as GST is not company profit)
    revenue_cursor = db.bills.aggregate([
        {"$match": {"paymentStatus": "Paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$afterDiscount"}}}
    ])
    revenue_list = list(revenue_cursor)
    total_revenue = revenue_list[0]['total'] if revenue_list else 0

    invoice_count = db.bills.count_documents({})
    low_stock_count = db.products.count_documents({"quantity": {"$lt": 20}})

    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_sales_cursor = db.bills.aggregate([
        {"$match": {
            "paymentStatus": "Paid",
            "billDate": {"$gte": today}
        }},
        {"$group": {
            "_id": None,
            "total": {"$sum": "$afterDiscount"},  # Revenue excludes GST
            "profit": {"$sum": "$totalProfit"}
        }}
    ])
    today_sales_list = list(today_sales_cursor)
    today_sales = today_sales_list[0]['total'] if today_sales_list else 0
    today_profit = today_sales_list[0]['profit'] if today_sales_list else 0

    return jsonify({
        "totalProducts": product_count,
        "totalCustomers": customer_count,
        "totalRevenue": total_revenue,
        "totalInvoices": invoice_count,
        "lowStockCount": low_stock_count,
        "todaySales": today_sales,
        "todayProfit": today_profit
    })

@analytics_bp.route('/top-products', methods=['GET'])
@authenticate_token
def top_products():
    db = get_db()
    limit = int(request.args.get('limit', 10))
    days = int(request.args.get('days', 30))
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    bills = db.bills.find({"billDate": {"$gte": start_date}})
    
    product_sales = {}
    for bill in bills:
        for item in bill.get("items", []):
            name = item.get("productName")
            if not name: continue
            
            if name not in product_sales:
                product_sales[name] = {"quantity": 0, "revenue": 0, "profit": 0}
                
            product_sales[name]["quantity"] += item.get("quantity", 0)
            product_sales[name]["revenue"] += item.get("lineSubtotal", 0)
            product_sales[name]["profit"] += item.get("lineProfit", 0)
            
    # Sort and slice
    sorted_items = sorted(
        [{"name": k, **v} for k, v in product_sales.items()],
        key=lambda x: x["revenue"],
        reverse=True
    )[:limit]

    return jsonify(sorted_items)

@analytics_bp.route('/revenue', methods=['GET'])
@authenticate_token
def get_revenue():
    db = get_db()
    days = int(request.args.get('days', 30))
    start_date = datetime.utcnow() - timedelta(days=days)
    
    bills = list(db.bills.find({"billDate": {"$gte": start_date}}))

    # Revenue excludes GST (GST is not company profit, it's collected for government)
    total_rev = sum(b.get("afterDiscount", 0) for b in bills)
    total_prof = sum(b.get("totalProfit", 0) for b in bills)
    total_cost = sum(b.get("totalCost", 0) for b in bills)
    total_bills = len(bills)
    
    profit_margin = round((total_prof / total_rev * 100), 2) if total_rev > 0 else 0
    avg_order = round(total_rev / total_bills) if total_bills > 0 else 0
    
    return jsonify({
        "totalRevenue": round(total_rev),
        "totalProfit": round(total_prof),
        "totalCost": round(total_cost),
        "profitMargin": f"{profit_margin:.2f}",
        "totalBills": total_bills,
        "averageOrderValue": avg_order
    })

@analytics_bp.route('/profit', methods=['GET'])
@authenticate_token
def get_profit_trend():
    db = get_db()
    days = int(request.args.get('days', 30))
    start_date = datetime.utcnow() - timedelta(days=days)
    
    bills = db.bills.find({"billDate": {"$gte": start_date}}).sort("billDate", 1)
    
    daily_profit = {}
    for bill in bills:
        # Convert to local datestring or isoformat
        if 'billDate' not in bill: continue
        bd = bill['billDate']
        if isinstance(bd, datetime):
            date_str = bd.strftime('%m/%d/%Y')  # Matches JS toLocaleDateString roughly
        else:
            date_str = str(bd)[:10]
            
        if date_str not in daily_profit:
            daily_profit[date_str] = {"revenue": 0, "profit": 0, "count": 0}

        # Revenue excludes GST
        daily_profit[date_str]["revenue"] += bill.get("afterDiscount", 0)
        daily_profit[date_str]["profit"] += bill.get("totalProfit", 0)
        daily_profit[date_str]["count"] += 1

    return jsonify(daily_profit)

@analytics_bp.route('/low-stock', methods=['GET'])
@authenticate_token
def low_stock_detailed():
    db = get_db()
    
    # We can do $expr $lte $quantity $minStock
    # OR simpler approach with Python if db is small, but let's use pymongo aggregate
    low_stock_cursor = db.products.find({
        "$expr": { "$lte": ["$quantity", "$minStock"] }
    }).sort("quantity", 1)
    
    formatted = []
    for p in low_stock_cursor:
        quantity = p.get('quantity', 0)
        min_stock = p.get('minStock', 10)
        formatted.append({
            "name": p.get('name'),
            "currentStock": quantity,
            "minStock": min_stock,
            "shortage": min_stock - quantity
        })
        
    return jsonify(formatted)

@analytics_bp.route('/sales-trend', methods=['GET'])
@authenticate_token
def sales_trend():
    db = get_db()
    days = int(request.args.get('days', 30))
    start_date = datetime.utcnow() - timedelta(days=days)

    sales = db.bills.find({"billDate": {"$gte": start_date}}).sort("billDate", 1)

    daily_sales = {}
    for bill in sales:
        bd = bill.get('billDate')
        if not bd: continue
        
        if isinstance(bd, datetime):
            date_str = bd.strftime('%m/%d/%Y')
        else:
            date_str = str(bd)[:10]

        if date_str not in daily_sales:
            daily_sales[date_str] = {"revenue": 0, "profit": 0, "count": 0}

        # Revenue excludes GST
        daily_sales[date_str]["revenue"] += bill.get("afterDiscount", 0)
        daily_sales[date_str]["profit"] += bill.get("totalProfit", 0)
        daily_sales[date_str]["count"] += 1

    return jsonify(daily_sales)

@analytics_bp.route('/revenue-profit', methods=['GET'])
@authenticate_token
def revenue_profit():
    db = get_db()
    days = int(request.args.get('days', 30))
    start_date = datetime.utcnow() - timedelta(days=days)

    bills = list(db.bills.find({"billDate": {"$gte": start_date}}).sort("billDate", 1))

    # Revenue excludes GST (GST is collected for government, not company profit)
    total_rev = sum(b.get("afterDiscount", 0) for b in bills)
    total_prof = sum(b.get("totalProfit", 0) for b in bills)
    total_cost = sum(b.get("totalCost", 0) for b in bills)
    total_sales = len(bills)

    # Operational expenses only (exclude auto-generated inventory purchase expenses).
    # Auto-generated expenses represent the cost of purchased stock and are already
    # accounted for as COGS in each bill's totalCost/totalProfit.
    # Including them again here would double-count inventory cost against profits.
    expenses_cursor = db.expenses.aggregate([
        {"$match": {"date": {"$gte": start_date}, "autoGenerated": {"$ne": True}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ])
    exp_list = list(expenses_cursor)
    total_expenses = exp_list[0]['total'] if exp_list else 0

    net_profit = total_prof - total_expenses

    daily_map = {}
    for bill in bills:
        bd = bill.get("billDate")
        if not bd: continue
        
        if isinstance(bd, datetime):
            date_iso = bd.isoformat().split('T')[0]
        else:
            date_iso = str(bd)[:10]
            
        if date_iso not in daily_map:
            daily_map[date_iso] = {"date": date_iso, "revenue": 0, "profit": 0, "sales": 0}

        # Revenue excludes GST
        daily_map[date_iso]["revenue"] += bill.get("afterDiscount", 0)
        daily_map[date_iso]["profit"] += bill.get("totalProfit", 0)
        daily_map[date_iso]["sales"] += 1

    daily_data = sorted(list(daily_map.values()), key=lambda x: x["date"])

    profit_margin = round((total_prof / total_rev * 100), 2) if total_rev > 0 else 0
    avg_order = round(total_rev / total_sales) if total_sales > 0 else 0

    return jsonify({
        "totalRevenue": round(total_rev),
        "totalProfit": round(total_prof),
        "totalCost": round(total_cost),
        "totalExpenses": round(total_expenses),
        "netProfit": round(net_profit),
        "totalSales": total_sales,
        "profitMargin": f"{profit_margin:.2f}",
        "averageOrderValue": avg_order,
        "dailyData": daily_data
    })
