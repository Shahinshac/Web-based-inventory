"""
Customer Portal Routes
Handles customer-specific data endpoints like dashboard, invoices, warranties, EMI
"""

import logging
import jwt
from datetime import datetime, timedelta
from bson import ObjectId
from flask import Blueprint, request, jsonify, current_app, g, send_file
from database import get_db
from utils.auth_middleware import authenticate_token, require_customer
from utils.constants import COMPANY_NAME, COMPANY_PHONE
from services.customer_service import build_vcard, build_pvc_card_pdf
from utils.tzutils import utc_now, to_iso_string

logger = logging.getLogger(__name__)

customer_portal_bp = Blueprint('customer_portal', __name__)

# ==================== MIDDLEWARE ====================

def get_current_customer():
    """Get current customer from JWT token"""
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return None

        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        db = get_db()
        customer = db.customers.find_one({"email": payload.get('email')})
        return customer
    except Exception as e:
        logger.error(f"Error getting customer: {e}")
        return None

def get_customer_match_query(customer):
    """Build a robust match query for a customer (ID, Name, Phone, Email)"""
    customer_id = customer['_id']
    or_conditions = [
        {"customerId": customer_id},
        {"customerId": str(customer_id)}
    ]

    if customer.get('name') and str(customer.get('name')).lower() != "walk-in customer":
        import re
        customer_name = str(customer.get('name')).strip()
        or_conditions.append({"customerName": customer_name})
        or_conditions.append({"customerName": re.compile(f"^{re.escape(customer_name)}$", re.I)})

    if customer.get('phone') and str(customer.get('phone')).strip() != "":
        customer_phone = str(customer.get('phone')).strip()
        or_conditions.append({"customerPhone": customer_phone})

        normalized_phone = ''.join(ch for ch in customer_phone if ch.isdigit())
        if normalized_phone:
            or_conditions.append({"customerPhone": normalized_phone})
            if normalized_phone.startswith('91') and len(normalized_phone) > 10:
                or_conditions.append({"customerPhone": normalized_phone[-10:]})

    if customer.get('email') and str(customer.get('email')).strip() != "":
        import re
        customer_email = str(customer.get('email')).strip()
        or_conditions.append({"customerEmail": customer_email})
        email_regex = re.compile(f"^{re.escape(customer_email)}$", re.I)
        or_conditions.append({"customerEmail": email_regex})

    match_query = {"$or": or_conditions}
    logger.info(f"[get_customer_match_query] 🔍 Match query for {customer.get('name')} ({customer_id}): {match_query}")

    return match_query

# ==================== DASHBOARD ====================

@customer_portal_bp.route('/dashboard', methods=['GET'])
@authenticate_token
def get_dashboard():
    """Get customer dashboard statistics"""
    try:
        db = get_db()
        customer = get_current_customer()
        if not customer:
            return jsonify({"error": "Customer not found"}), 404

        match_query = get_customer_match_query(customer)

        # Get invoices for this customer
        invoices = list(db.bills.find(match_query))

        # Calculate stats
        total_purchases = len(invoices)
        total_spent = sum(float(inv.get('grandTotal', 0)) for inv in invoices)

        # Get latest purchases
        recent_invoices = sorted(invoices, key=lambda x: x.get('billDate', utc_now()), reverse=True)[:5]

        # Get warranties
        warranties = list(db.warranties.find(match_query))
        active_warranties = len([w for w in warranties if w.get('status') == 'active'])
        expired_warranties = len([w for w in warranties if w.get('status') == 'expired'])

        return jsonify({
            "memberSince": customer.get('createdAt').isoformat() if customer.get('createdAt') and hasattr(customer.get('createdAt'), 'isoformat') else None,
            "stats": {
                "totalPurchases": total_purchases,
                "totalSpent": round(total_spent, 2),
                "activeWarranties": active_warranties,
                "expiredWarranties": expired_warranties
            },
            "recentPurchases": [
                {
                    "id": str(inv['_id']),
                    "invoiceNo": inv.get('billNumber'),
                    "date": inv.get('billDate').isoformat() if inv.get('billDate') and hasattr(inv.get('billDate'), 'isoformat') else None,
                    "total": float(inv.get('grandTotal', 0)),
                    "itemCount": len(inv.get('items', []))
                }
                for inv in recent_invoices
            ]
        })

    except Exception as e:
        logger.error(f"Dashboard error: {e}")
        return jsonify({"error": "Failed to fetch dashboard"}), 500

# ==================== INVOICES ====================

@customer_portal_bp.route('/invoices', methods=['GET'])
@authenticate_token
def get_customer_invoices():
    """Get all invoices for current customer"""
    try:
        customer = get_current_customer()
        if not customer:
            return jsonify({"error": "Customer not found"}), 404

        match_query = get_customer_match_query(customer)

        # Pagination
        page = max(1, int(request.args.get('page', 1)))
        limit = min(int(request.args.get('limit', 20)), 100)
        skip = (page - 1) * limit

        # Fetch invoices
        db = get_db()
        invoices_cursor = db.bills.find(match_query).sort("billDate", -1).skip(skip).limit(limit)
        total = db.bills.count_documents(match_query)

        invoices = []
        for inv in invoices_cursor:
            try:
                # Safely serialize items array
                items = []
                for item in inv.get('items', []):
                    items.append({
                        "productId": str(item.get('productId')) if item.get('productId') else None,
                        "productName": str(item.get('productName', 'Unknown')),
                        "quantity": float(item.get('quantity', 0)),
                        "unitPrice": float(item.get('unitPrice', 0)),
                        "lineSubtotal": float(item.get('lineSubtotal', 0)),
                        "lineGstAmount": float(item.get('lineGstAmount', 0))
                    })

                invoices.append({
                    "id": str(inv['_id']),
                    "invoiceNo": str(inv.get('billNumber', 'N/A')),
                    "date": inv.get('billDate').isoformat() if inv.get('billDate') and hasattr(inv.get('billDate'), 'isoformat') else None,
                    "total": float(inv.get('grandTotal', 0)),
                    "paymentMethod": str(inv.get('paymentMode', 'cash')),
                    "emiEnabled": bool(inv.get('emiEnabled', False)),
                    "emiTenure": int(inv.get('emiTenure', 0) or 0),
                    "emiMonthlyAmount": float(inv.get('emiMonthlyAmount', 0) or 0),
                    "items": items,
                    "itemCount": len(items)
                })
            except Exception as item_err:
                logger.warning(f"Error processing invoice {inv.get('_id')}: {item_err}")
                continue

        response = jsonify({
            "invoices": invoices,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        })
        response.headers['X-Total-Count'] = str(total)
        return response

    except Exception as e:
        logger.error(f"[get_customer_invoices] ❌ Invoices error: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Failed to fetch invoices",
            "message": str(e),
            "details": str(e)
        }), 500

@customer_portal_bp.route('/invoices/<invoice_id>/pdf', methods=['GET'])
@authenticate_token
def download_invoice_pdf(invoice_id):
    """Get invoice as HTML for printing/PDF download (same format as main system)"""
    try:
        customer = get_current_customer()
        if not customer:
            logger.warning(f"[download_invoice_pdf] Customer not found")
            return jsonify({"error": "Customer not found"}), 404

        db = get_db()

        # Find invoice by ID or bill number
        invoice = None
        try:
            invoice = db.bills.find_one({"_id": ObjectId(invoice_id)})
        except:
            invoice = db.bills.find_one({"billNumber": invoice_id})

        if not invoice:
            logger.warning(f"[download_invoice_pdf] Invoice not found: {invoice_id}")
            return jsonify({"error": "Invoice not found"}), 404

        # Verify customer owns this invoice
        customer_id = customer['_id']
        match_query = {
            "$or": [
                {"customerId": customer_id},
                {"customerId": str(customer_id)},
                {"customerPhone": customer.get('phone')},
                {"customerEmail": customer.get('email')}
            ]
        }

        if not db.bills.find_one({"_id": invoice["_id"], **match_query}):
            logger.warning(f"[download_invoice_pdf] Access denied for invoice: {invoice_id}")
            return jsonify({"error": "Invoice not found or access denied"}), 404

        logger.info(f"[download_invoice_pdf] 📄 Generating HTML invoice: {invoice.get('billNumber')}")

        # Import timezone utilities
        from utils.tzutils import format_ist_date, format_ist_time

        # Format invoice data - Convert UTC to IST for display
        bill_date = invoice.get('billDate')
        bill_date_str = format_ist_date(bill_date) if bill_date else 'N/A'
        bill_time_str = format_ist_time(bill_date) if bill_date else ''

        bill_number = invoice.get('billNumber', 'N/A')
        customer_name = invoice.get('customerName', 'Walk-in Customer')
        customer_phone = invoice.get('customerPhone', '')
        customer_address = invoice.get('customerAddress', '')
        customer_place = invoice.get('customerPlace', '')
        payment_mode = invoice.get('paymentMode', 'cash')
        payment_mode_display = payment_mode.capitalize()

        # Extract financial data
        subtotal = invoice.get('subtotal', 0) or 0
        discount_pct = invoice.get('discountPercent', 0) or 0
        discount_amt = invoice.get('discountAmount', 0) or 0
        after_discount = invoice.get('afterDiscount', subtotal - discount_amt) or 0
        cgst = invoice.get('cgst', 0) or 0
        sgst = invoice.get('sgst', 0) or 0
        igst = invoice.get('igst', 0) or 0
        gst_amount = invoice.get('gstAmount', 0) or 0
        grand_total = invoice.get('grandTotal', 0) or 0
        is_same_state = invoice.get('isSameState', True)

        # Build items rows
        items_html = ""
        for idx, item in enumerate(invoice.get('items', []), 1):
            try:
                gst_pct = item.get('gstPercent', 18)
                line_subtotal = item.get('lineSubtotal', 0) or 0
                line_gst = item.get('lineGstAmount', 0) or 0
                unit_price = item.get('unitPrice', 0) or 0
                qty = item.get('quantity', 0) or 0
                hsn = item.get('hsnCode', 'N/A')
                items_html += f"""
        <tr>
          <td style="text-align:center;color:#64748b;font-weight:500;">{idx}</td>
          <td>
            <div style="font-weight:600;color:#0f172a;">{item.get('productName', 'Unknown')}</div>
            {f'<div style="font-size:11px;color:#94a3b8;margin-top:2px;">HSN: {hsn}</div>' if hsn and hsn != 'N/A' else ''}
          </td>
          <td style="text-align:center;">{qty}</td>
          <td style="text-align:right;">&#8377;{unit_price:.2f}</td>
          <td style="text-align:center;">{gst_pct}%</td>
          <td style="text-align:right;">&#8377;{line_gst:.2f}</td>
          <td style="text-align:right;font-weight:600;">&#8377;{(line_subtotal + line_gst):.2f}</td>
        </tr>
        """
            except Exception as item_err:
                logger.warning(f"[download_invoice_pdf] Error processing item: {item_err}")
                continue

        # GST summary rows
        gst_rows = ''
        if is_same_state:
            if cgst > 0:
                gst_rows += f'<div class="sum-row"><span>CGST (9%)</span><span>&#8377;{cgst:.2f}</span></div>'
                gst_rows += f'<div class="sum-row"><span>SGST (9%)</span><span>&#8377;{sgst:.2f}</span></div>'
        else:
            if igst > 0:
                gst_rows += f'<div class="sum-row"><span>IGST (18%)</span><span>&#8377;{igst:.2f}</span></div>'

        if not gst_rows and gst_amount > 0:
            gst_rows = f'<div class="sum-row"><span>GST</span><span>&#8377;{gst_amount:.2f}</span></div>'

        # Helper functions for formatting
        company_name = COMPANY_NAME
        company_phone = COMPANY_PHONE
        company_address = COMPANY_ADDRESS
        company_email = COMPANY_EMAIL
        company_gstin = COMPANY_GSTIN

        gstin_row = f'<p class="gstin">GSTIN: {company_gstin}</p>' if company_gstin else ''
        email_part = f' | {company_email}' if company_email else ''
        time_row = f'<tr><td class="meta-label">Time:</td><td class="meta-value">{bill_time_str}</td></tr>' if bill_time_str else ''
        phone_row = f'<p>Phone: {customer_phone}</p>' if customer_phone else ''
        addr_row = f'<p>{customer_address}</p>' if customer_address else ''
        place_row = f'<p>{customer_place}</p>' if customer_place else ''
        disc_row = (f'<div class="sum-row discount"><span>Discount ({discount_pct}%)</span>'
                    f'<span>-&#8377;{discount_amt:.2f}</span></div>') if discount_amt > 0 else ''

        # EMI Details
        emi_details = invoice.get('emiDetails')
        emi_html = ""
        if payment_mode == 'emi' and emi_details:
            total_amt = emi_details.get('totalAmount', grand_total)
            down_pmt = float(emi_details.get('downPayment', 0))
            monthly_emi = float(emi_details.get('emiAmount', 0))
            tenure = int(emi_details.get('months', 0))
            interest = float(emi_details.get('interestRate', 0))

            start_date_str = format_ist_date(emi_details.get('startDate')) if emi_details.get('startDate') else 'N/A'
            end_date_str = format_ist_date(emi_details.get('endDate')) if emi_details.get('endDate') else 'N/A'

            emi_html = f"""
        <div style="margin-top:12px;padding:14px;background:#fdf2f8;border:1px solid #fbcfe8;border-radius:8px;">
          <p style="color:#be185d;font-weight:700;font-size:12px;text-transform:uppercase;margin-bottom:8px;">📊 EMI Payment Plan</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11px;color:#334155;">
            <div><span style="color:#94a3b8;">Total Amount:</span> <strong>&#8377;{total_amt:.2f}</strong></div>
            <div><span style="color:#94a3b8;">Down Payment:</span> <strong>&#8377;{down_pmt:.2f}</strong></div>
            <div><span style="color:#94a3b8;">Monthly EMI:</span> <strong style="color:#be185d;">&#8377;{monthly_emi:.2f}</strong></div>
            <div><span style="color:#94a3b8;">Tenure:</span> <strong>{tenure} Months</strong></div>
            <div><span style="color:#94a3b8;">Interest Rate:</span> <strong>{interest}%</strong></div>
            <div><span style="color:#94a3b8;">Start Date:</span> <strong>{start_date_str}</strong></div>
            <div style="grid-column:span 2;"><span style="color:#94a3b8;">End Date:</span> <strong>{end_date_str}</strong></div>
          </div>
        </div>
        """

        # Generate HTML invoice
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice {bill_number} - {company_name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    *{{margin:0;padding:0;box-sizing:border-box;}}
    @page{{size:A4;margin:0;}}
    body{{
      font-family:'Inter',system-ui,-apple-system,sans-serif;
      background:#f1f5f9;
      color:#0f172a;
      display:flex;
      flex-direction:column;
      align-items:center;
      padding:20px;
      -webkit-print-color-adjust:exact!important;
      print-color-adjust:exact!important;
    }}
    .invoice-page{{
      width:210mm;
      min-height:297mm;
      background:#fff;
      padding:0;
      position:relative;
      overflow:hidden;
    }}
    .accent-bar{{height:6px;background:linear-gradient(90deg,#4f46e5,#7c3aed,#6366f1);}}
    .invoice-inner{{padding:40px 44px 30px;}}
    .inv-header{{
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      margin-bottom:32px;
      padding-bottom:24px;
      border-bottom:2px solid #e2e8f0;
    }}
    .company-block h1{{font-size:26px;font-weight:800;color:#4f46e5;letter-spacing:-0.5px;margin-bottom:6px;}}
    .company-block p{{font-size:12.5px;color:#64748b;line-height:1.6;}}
    .company-block .gstin{{font-weight:600;color:#334155;margin-top:4px;}}
    .inv-title-block{{text-align:right;}}
    .inv-title-block h2{{font-size:22px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;}}
    .meta-table{{font-size:12.5px;text-align:right;border-collapse:collapse;}}
    .meta-table td{{padding:3px 0;}}
    .meta-label{{color:#94a3b8;font-weight:500;padding-right:14px;}}
    .meta-value{{color:#0f172a;font-weight:700;}}
    .bill-grid{{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:24px;
      margin-bottom:28px;
      background:#f8fafc;
      border:1px solid #e2e8f0;
      border-radius:10px;
      padding:20px 24px;
    }}
    .bill-grid h3{{
      font-size:11px;text-transform:uppercase;letter-spacing:1.2px;
      color:#4f46e5;font-weight:700;margin-bottom:10px;padding-bottom:6px;
      border-bottom:2px solid #e0e7ff;display:inline-block;
    }}
    .bill-grid p{{font-size:13px;color:#334155;line-height:1.7;}}
    .bill-grid .cust-name{{font-size:15px;font-weight:700;color:#0f172a;margin-bottom:2px;}}
    .items-table{{
      width:100%;border-collapse:separate;border-spacing:0;
      margin-bottom:28px;font-size:13px;
    }}
    .items-table th{{
      background:#f1f5f9;color:#64748b;text-transform:uppercase;
      font-size:11px;font-weight:700;letter-spacing:0.5px;
      padding:12px 14px;border-bottom:2px solid #e2e8f0;
    }}
    .items-table th:first-child{{border-radius:8px 0 0 8px;text-align:center;width:40px;}}
    .items-table th:last-child{{border-radius:0 8px 8px 0;text-align:right;}}
    .items-table td{{padding:14px;border-bottom:1px solid #f1f5f9;color:#334155;vertical-align:top;}}
    .items-table tr:last-child td{{border-bottom:none;}}
    .summary-section{{display:flex;justify-content:flex-end;margin-bottom:80px;}}
    .summary-box{{
      width:300px;background:#f8fafc;border:1px solid #e2e8f0;
      border-radius:10px;padding:20px 24px;
    }}
    .sum-row{{
      display:flex;justify-content:space-between;
      font-size:13px;color:#64748b;padding:6px 0;
    }}
    .sum-row.discount{{color:#10b981;font-weight:600;}}
    .sum-row.total{{
      margin-top:10px;padding-top:12px;border-top:2px solid #e2e8f0;
      font-size:18px;font-weight:800;color:#4f46e5;
    }}
    .inv-footer{{
      position:absolute;bottom:0;left:0;right:0;
      padding:20px 44px 24px;text-align:center;
      border-top:1px solid #e2e8f0;background:#fafbfc;
    }}
    .inv-footer .thanks{{font-weight:700;font-size:14px;color:#0f172a;margin-bottom:4px;}}
    .inv-footer p{{font-size:12px;color:#94a3b8;line-height:1.5;}}
    @media print{{
      body{{background:#fff;padding:0;}}
      .invoice-page{{width:100%;min-height:auto;box-shadow:none;}}
      .no-print{{display:none!important;}}
    }}
    .print-bar{{
      position:fixed;top:0;left:0;right:0;
      background:linear-gradient(135deg,#4f46e5,#7c3aed);
      padding:14px 24px;display:flex;align-items:center;
      justify-content:center;gap:16px;z-index:999;
      box-shadow:0 4px 20px rgba(79,70,229,0.3);
    }}
    .print-bar span{{color:#fff;font-size:14px;font-weight:500;}}
    .print-bar button{{
      background:#fff;color:#4f46e5;border:none;
      padding:10px 28px;border-radius:8px;font-weight:700;
      font-size:14px;cursor:pointer;transition:all 0.2s;
    }}
    .print-bar button:hover{{transform:scale(1.05);box-shadow:0 4px 12px rgba(0,0,0,0.15);}}
  </style>
</head>
<body>
  <div class="print-bar no-print">
    <span>&#128196; Invoice {bill_number}</span>
    <button onclick="window.print()">&#128424; Print / Save PDF</button>
    <button onclick="window.close()" style="background:#f1f5f9;color:#475569;">&#10005; Close</button>
  </div>

  <div class="invoice-page" style="margin-top:70px;">
    <div class="accent-bar"></div>
    <div class="invoice-inner">

      <div class="inv-header">
        <div class="company-block">
          <h1>&#9889; {company_name}</h1>
          <p>{company_address}</p>
          <p>Phone: {company_phone}{email_part}</p>
          {gstin_row}
        </div>
        <div class="inv-title-block">
          <h2>Tax Invoice</h2>
          <table class="meta-table">
            <tr><td class="meta-label">Invoice No:</td><td class="meta-value">{bill_number}</td></tr>
            <tr><td class="meta-label">Date:</td><td class="meta-value">{bill_date_str}</td></tr>
            {time_row}
          </table>
        </div>
      </div>

      <div class="bill-grid">
        <div>
          <h3>Billed To</h3>
          <p class="cust-name">{customer_name}</p>
          {phone_row}
          {addr_row}
          {place_row}
        </div>
        <div>
          <h3>Payment Info</h3>
          <p><strong>Method:</strong> {payment_mode_display}</p>
          <p style="margin-top:6px;"><strong>Status:</strong> <span style="color:#10b981;font-weight:700;">Paid &#10003;</span></p>
          {emi_html}
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Item Description</th>
            <th style="text-align:center;">Qty</th>
            <th style="text-align:right;">Unit Price</th>
            <th style="text-align:center;">GST%</th>
            <th style="text-align:right;">GST Amt</th>
            <th style="text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>{items_html}</tbody>
      </table>

      <div class="summary-section">
        <div class="summary-box">
          <div class="sum-row"><span>Subtotal</span><span>&#8377;{subtotal:.2f}</span></div>
          {disc_row}
          <div class="sum-row"><span>Taxable Amount</span><span>&#8377;{after_discount:.2f}</span></div>
          {gst_rows}
          <div class="sum-row total"><span>Grand Total</span><span>&#8377;{grand_total:.2f}</span></div>
        </div>
      </div>
    </div>

    <div class="inv-footer">
      <div class="thanks">Thank you for your business!</div>
      <p>For queries, contact us at {company_phone}{email_part}</p>
      <p style="font-size:10px;margin-top:8px;color:#cbd5e1;">This is a computer-generated invoice and does not require a physical signature.</p>
    </div>
  </div>

  <script>
    document.fonts.ready.then(function() {{}});
  </script>
</body>
</html>"""

        logger.info(f"[download_invoice_pdf] ✅ HTML invoice generated successfully")
        return html, 200, {'Content-Type': 'text/html; charset=utf-8'}

    except Exception as e:
        logger.error(f"[download_invoice_pdf] ❌ Error: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Failed to fetch invoice",
            "message": str(e),
            "errorType": type(e).__name__
        }), 500


# ==================== PROFILE ====================

@customer_portal_bp.route('/profile', methods=['GET'])
@authenticate_token
def get_customer_profile():
    """Get customer profile"""
    try:
        customer = get_current_customer()
        if not customer:
            return jsonify({"error": "Customer not found"}), 404

        return jsonify({
            "id": str(customer['_id']),
            "name": customer.get('name'),
            "email": customer.get('email'),
            "phone": customer.get('phone'),
            "role": customer.get('role')
        })

    except Exception as e:
        logger.error(f"Profile error: {e}")
        return jsonify({"error": "Failed to fetch profile"}), 500

@customer_portal_bp.route('/profile', methods=['PATCH'])
@authenticate_token
def update_customer_profile():
    """Update customer profile"""
    try:
        customer = get_current_customer()
        if not customer:
            return jsonify({"error": "Customer not found"}), 404

        data = request.get_json() or {}

        # Allowed fields
        allowed_fields = ['name', 'phone']
        update_data = {k: v for k, v in data.items() if k in allowed_fields}

        if not update_data:
            return jsonify({"error": "No valid fields to update"}), 400

        db = get_db()
        db.customers.update_one(
            {"_id": customer['_id']},
            {"$set": update_data}
        )

        return jsonify({
            "success": True,
            "message": "Profile updated successfully"
        })

    except Exception as e:
        logger.error(f"Profile update error: {e}")
        return jsonify({"error": "Failed to update profile"}), 500

@customer_portal_bp.route('/change-password', methods=['POST'])
@authenticate_token
def change_customer_password():
    """Password change is handled by customer_auth blueprint"""
    return jsonify({
        "error": "Use /api/customer-auth/change-password endpoint",
        "message": "Password changes should be done through the authentication endpoints"
    }), 400

@customer_portal_bp.route('/vcard', methods=['GET'])
@authenticate_token
def download_vcard():
    """Download vCard for the current customer"""
    try:
        customer = get_current_customer()
        if not customer:
            return jsonify({"error": "Customer not found"}), 404

        vcard_text = build_vcard(customer)
        safe_name = customer.get('name', 'contact').replace(' ', '_')
        
        return vcard_text, 200, {
            'Content-Type': 'text/vcard; charset=utf-8',
            'Content-Disposition': f'attachment; filename="{safe_name}.vcf"'
        }
    except Exception as e:
        logger.error(f"vCard error: {e}")
        return jsonify({"error": "Failed to generate vCard"}), 500

@customer_portal_bp.route('/pvc-card', methods=['GET'])
@authenticate_token
def download_pvc_card():
    """Download PVC-sized PDF card for the current customer"""
    try:
        customer = get_current_customer()
        if not customer:
            return jsonify({"error": "Customer not found"}), 404

        pdf_buffer = build_pvc_card_pdf(customer, COMPANY_NAME, COMPANY_PHONE)
        safe_name = customer.get('name', 'customer').replace(' ', '_')
        
        return send_file(
            pdf_buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f"card_{safe_name}.pdf"
        )
    except Exception as e:
        logger.error(f"PVC card error: {e}")
        return jsonify({"error": "Failed to generate identity card"}), 500
