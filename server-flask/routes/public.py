from flask import Blueprint, jsonify, request, render_template_string
from datetime import datetime
from bson import ObjectId
from database import get_db
from utils.tzutils import utc_now, to_iso_string

public_bp = Blueprint('public', __name__)

INVOICE_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice {{ bill.billNumber }}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        :root {
            --primary: #4f46e5;
            --primary-dark: #3730a3;
            --text-main: #0f172a;
            --text-sub: #475569;
            --bg-body: #f8fafc;
            --border-color: #e2e8f0;
        }

        body {
            font-family: 'Inter', sans-serif;
            background: var(--bg-body);
            color: var(--text-main);
            margin: 0;
            padding: 40px;
            display: flex;
            justify-content: center;
        }

        .invoice-container {
            background: white;
            padding: 50px;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
            width: 100%;
            max-width: 800px;
            border-top: 8px solid var(--primary);
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            border-bottom: 2px solid var(--border-color);
            padding-bottom: 30px;
        }

        .company-details h1 {
            color: var(--primary);
            margin: 0 0 8px 0;
            font-weight: 800;
            font-size: 28px;
            letter-spacing: -0.5px;
        }

        .company-details p {
            margin: 4px 0;
            color: var(--text-sub);
            font-size: 14px;
        }

        .invoice-details {
            text-align: right;
        }

        .invoice-details h2 {
            margin: 0 0 10px 0;
            color: var(--text-main);
            font-weight: 800;
            font-size: 24px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .meta-grid {
            display: grid;
            grid-template-columns: auto auto;
            gap: 8px 24px;
            text-align: right;
            font-size: 14px;
        }

        .meta-label { color: var(--text-sub); font-weight: 500; }
        .meta-value { color: var(--text-main); font-weight: 700; }

        .billing-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
            background: #f8fafc;
            padding: 24px;
            border-radius: 12px;
            border: 1px solid var(--border-color);
        }

        .bill-section h3 {
            margin: 0 0 12px 0;
            color: var(--primary-dark);
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 700;
            border-bottom: 2px solid #e0e7ff;
            padding-bottom: 8px;
            display: inline-block;
        }

        .bill-section p {
            margin: 6px 0;
            font-size: 14px;
            color: var(--text-main);
        }

        table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            margin-bottom: 40px;
        }

        th {
            background: #f1f5f9;
            color: var(--text-sub);
            text-transform: uppercase;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.5px;
            padding: 14px 16px;
            text-align: left;
            border-bottom: 2px solid var(--border-color);
        }

        th:first-child { border-top-left-radius: 8px; border-bottom-left-radius: 8px; }
        th:last-child { border-top-right-radius: 8px; border-bottom-right-radius: 8px; text-align: right; }

        td {
            padding: 16px;
            border-bottom: 1px solid var(--border-color);
            color: var(--text-main);
            font-size: 14px;
        }

        td:last-child { text-align: right; font-weight: 600; }
        tr:last-child td { border-bottom: none; }

        .item-name { font-weight: 600; color: var(--text-main); }
        .item-hsn { font-size: 12px; color: var(--text-sub); margin-top: 4px; display: block; }

        .summary-box {
            width: 320px;
            margin-left: auto;
            background: #f8fafc;
            border-radius: 12px;
            padding: 24px;
            border: 1px solid var(--border-color);
        }

        .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            font-size: 14px;
            color: var(--text-sub);
        }

        .summary-row.total {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 2px solid var(--border-color);
            color: var(--primary);
            font-size: 20px;
            font-weight: 800;
        }

        .footer {
            margin-top: 60px;
            text-align: center;
            color: var(--text-sub);
            font-size: 14px;
            padding-top: 24px;
            border-top: 1px solid var(--border-color);
        }

        .footer .thank-you {
            font-weight: 700;
            color: var(--text-main);
            font-size: 16px;
            margin-bottom: 8px;
        }

        @media print {
            body { background: white; padding: 0; }
            .invoice-container { box-shadow: none; border-top: none; max-width: 100%; padding: 20px; }
            .billing-grid { background: white; border: none; padding: 0; }
            .summary-box { background: white; border: none; padding: 0; }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="header">
            <div class="company-details">
                <h1>{{ company.name }}</h1>
                <p>{{ company.address }}</p>
                <p>Phone: {{ company.phone }}</p>
                <p>Email: {{ company.email }}</p>
                {% if company.gstin %}
                <p><strong>GSTIN:</strong> {{ company.gstin }}</p>
                {% endif %}
            </div>
            <div class="invoice-details">
                <h2>TAX INVOICE</h2>
                <div class="meta-grid">
                    <span class="meta-label">Invoice No:</span>
                    <span class="meta-value">{{ bill.billNumber }}</span>
                    
                    <span class="meta-label">Date:</span>
                    <span class="meta-value">{{ bill_date }}</span>
                    
                    <span class="meta-label">Sales Person:</span>
                    <span class="meta-value">{{ bill.createdByUsername }}</span>
                    
                    <span class="meta-label">Time:</span>
                    <span class="meta-value">{{ bill_time }}</span>
                </div>
            </div>
        </div>

        <div class="billing-grid">
            <div class="bill-section">
                <h3>Billed To</h3>
                <p style="font-weight: 700; font-size: 16px;">{{ bill.customerName }}</p>
                {% if bill.customerPhone %}<p>Phone: {{ bill.customerPhone }}</p>{% endif %}
                {% if bill.customerAddress %}<p>{{ bill.customerAddress }}</p>{% endif %}
                {% if bill.customerPlace %}<p>{{ bill.customerPlace }}</p>{% endif %}
            </div>
            
            <div class="bill-section">
                <h3>Payment Info</h3>
                <p><strong>Method:</strong> {{ bill.paymentMode | title }}</p>
                {% if bill.splitPaymentDetails %}
                <p>Cash: ₹{{ "%.2f"|format(bill.splitPaymentDetails.cashAmount) }}</p>
                <p>Card: ₹{{ "%.2f"|format(bill.splitPaymentDetails.cardAmount) }}</p>
                <p>UPI: ₹{{ "%.2f"|format(bill.splitPaymentDetails.upiAmount) }}</p>
                {% endif %}
                <p><strong>Status:</strong> <span style="color: #10b981; font-weight: 700;">Paid</span></p>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Item Description</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                {% for item in bill.items %}
                <tr>
                    <td style="color: #64748b; font-weight: 500;">{{ loop.index }}</td>
                    <td>
                        <span class="item-name">{{ item.productName }}</span>
                        <span class="item-hsn">HSN: {{ item.hsnCode }}</span>
                    </td>
                    <td>{{ item.quantity }}</td>
                    <td>₹{{ "%.2f"|format(item.unitPrice) }}</td>
                    <td>₹{{ "%.2f"|format(item.lineSubtotal) }}</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>

        <div class="summary-box">
            <div class="summary-row">
                <span>Subtotal</span>
                <span>₹{{ "%.2f"|format(bill.subtotal) }}</span>
            </div>
            {% if bill.discountAmount and bill.discountAmount > 0 %}
            <div class="summary-row" style="color: #10b981; font-weight: 600;">
                <span>Discount ({{ bill.discountPercent }}%)</span>
                <span>-₹{{ "%.2f"|format(bill.discountAmount) }}</span>
            </div>
            {% endif %}
            
            {% if bill.cgst and bill.cgst > 0 %}
            <div class="summary-row">
                <span>CGST (9%)</span>
                <span>₹{{ "%.2f"|format(bill.cgst) }}</span>
            </div>
            <div class="summary-row">
                <span>SGST (9%)</span>
                <span>₹{{ "%.2f"|format(bill.sgst) }}</span>
            </div>
            {% endif %}
            
            {% if bill.igst and bill.igst > 0 %}
            <div class="summary-row">
                <span>IGST (18%)</span>
                <span>₹{{ "%.2f"|format(bill.igst) }}</span>
            </div>
            {% endif %}

            <div class="summary-row total">
                <span>Grand Total</span>
                <span>₹{{ "%.2f"|format(bill.grandTotal) }}</span>
            </div>
        </div>

        <div class="footer">
            <div class="thank-you">Thank you for your business!</div>
            <p>For any queries regarding this invoice, please contact us at {{ company.phone }} or {{ company.email }}</p>
            <p style="font-size: 11px; margin-top: 16px; color: #94a3b8;">This is a computer generated invoice and does not require a physical signature.</p>
        </div>
    </div>
    <script>
        window.onload = function() {
            const params = new URLSearchParams(window.location.search);
            if (params.get('print') === '1') {
                window.print();
            }
        };
    </script>
</body>
</html>
"""

@public_bp.route('/invoice/<token>', methods=['GET'])
def view_public_invoice(token):
    db = get_db()
    link_data = db.public_invoice_links.find_one({"token": token})
    
    if not link_data:
        return "<h1 style='text-align:center;font-family:sans-serif;margin-top:50px;color:#ef4444;'>🚫 Invoice Link Invalid or Expired</h1>", 404
        
    invoice_id = link_data.get('invoiceId')
    try:
        bill = db.bills.find_one({"_id": ObjectId(invoice_id)})
    except:
        bill = db.bills.find_one({"billNumber": invoice_id})

    if not bill:
        return "<h1 style='text-align:center;font-family:sans-serif;margin-top:50px;'>Invoice not found</h1>", 404

    company_snapshot = link_data.get('companySnapshot', {
        "name": "26:07 Electronics",
        "phone": "7594012761",
        "address": "Tech Street",
        "email": "support@example.com"
    })

    # Format Date
    bill_dt = bill.get("billDate")
    if not isinstance(bill_dt, datetime):
        # fallback to now if broken
        bill_dt = utc_now()
        
    bill_date_str = bill_dt.strftime("%d %b, %Y")
    bill_time_str = bill_dt.strftime("%I:%M %p")

    return render_template_string(
        INVOICE_TEMPLATE, 
        bill=bill,
        company=company_snapshot,
        bill_date=bill_date_str,
        bill_time=bill_time_str
    )
