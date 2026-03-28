from datetime import datetime
from bson import ObjectId
from flask import Blueprint, request, jsonify

from database import get_db
from utils.constants import COMPANY_NAME, COMPANY_PHONE, COMPANY_ADDRESS, COMPANY_EMAIL, COMPANY_GSTIN

public_invoice_bp = Blueprint('public_invoice', __name__)

# Public Invoice View Route (No Authentication Required)
@public_invoice_bp.route('/<token>', methods=['GET'])
def public_invoice_view(token):
    """View public invoice by token (accessible without authentication)"""
    db = get_db()

    # Find the public link
    public_link = db.public_invoice_links.find_one({"token": token})

    if not public_link:
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invoice Not Found</title>
            <style>
                body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
                .error { text-align: center; padding: 40px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #e53e3e; }
            </style>
        </head>
        <body>
            <div class="error">
                <h1>❌ Invoice Not Found</h1>
                <p>This invoice link is invalid or does not exist.</p>
            </div>
        </body>
        </html>
        """, 404

    # Check if expired
    if datetime.utcnow() > public_link.get('expiresAt'):
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Link Expired</title>
            <style>
                body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
                .error { text-align: center; padding: 40px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #ed8936; }
            </style>
        </head>
        <body>
            <div class="error">
                <h1>⏰ Link Expired</h1>
                <p>This invoice link has expired. Please request a new link.</p>
            </div>
        </body>
        </html>
        """, 410

    # Get the invoice
    try:
        invoice = db.bills.find_one({"_id": ObjectId(public_link.get('invoiceId'))})
    except Exception:
        invoice = None

    if not invoice:
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invoice Not Found</title>
            <style>
                body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
                .error { text-align: center; padding: 40px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #e53e3e; }
            </style>
        </head>
        <body>
            <div class="error">
                <h1>❌ Invoice Not Found</h1>
                <p>The invoice associated with this link could not be found.</p>
            </div>
        </body>
        </html>
        """, 404

    # Get company info from snapshot
    company = public_link.get('companySnapshot', {})
    company_name = company.get('name', COMPANY_NAME)
    company_phone = company.get('phone', COMPANY_PHONE)
    company_address = company.get('address', COMPANY_ADDRESS)
    company_email = company.get('email', COMPANY_EMAIL)
    company_gstin = company.get('gstin', COMPANY_GSTIN)

    # Format invoice data
    bill_date = invoice.get('billDate')
    if isinstance(bill_date, datetime):
        bill_date_str = bill_date.strftime('%d %b %Y')
        bill_time_str = bill_date.strftime('%I:%M %p')
    else:
        bill_date_str = str(bill_date)
        bill_time_str = ''

    bill_number = invoice.get('billNumber', 'N/A')
    customer_name = invoice.get('customerName', 'Walk-in Customer')
    customer_phone = invoice.get('customerPhone', '')
    customer_address = invoice.get('customerAddress', '')
    customer_place = invoice.get('customerPlace', '')
    payment_mode = invoice.get('paymentMode', 'cash')
    payment_mode_display = payment_mode.capitalize()

    subtotal = invoice.get('subtotal', 0) or 0
    discount_pct = invoice.get('discountPercent', 0) or 0
    discount_amt = invoice.get('discountAmount', 0) or 0
    after_discount = invoice.get('afterDiscount', subtotal - discount_amt) or 0
    cgst = invoice.get('cgst', 0) or 0
    sgst = invoice.get('sgst', 0) or 0
    igst = invoice.get('igst', 0) or 0
    gst_amount = invoice.get('gstAmount', 0) or 0
    grand_total = invoice.get('grandTotal', 0) or 0

    # Build items rows
    items_html = ""
    for idx, item in enumerate(invoice.get('items', []), 1):
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

    # GST summary rows
    gst_rows = ''
    if cgst > 0:
        gst_rows += f'<div class="sum-row"><span>CGST (9%)</span><span>&#8377;{cgst:.2f}</span></div>'
        gst_rows += f'<div class="sum-row"><span>SGST (9%)</span><span>&#8377;{sgst:.2f}</span></div>'
    elif igst > 0:
        gst_rows += f'<div class="sum-row"><span>IGST (18%)</span><span>&#8377;{igst:.2f}</span></div>'
    elif gst_amount > 0:
        gst_rows += f'<div class="sum-row"><span>GST</span><span>&#8377;{gst_amount:.2f}</span></div>'

    gstin_row = f'<p class="gstin">GSTIN: {company_gstin}</p>' if company_gstin else ''
    email_part = f' | {company_email}' if company_email else ''
    email_contact = f' or {company_email}' if company_email else ''
    time_row = f'<tr><td class="meta-label">Time:</td><td class="meta-value">{bill_time_str}</td></tr>' if bill_time_str else ''
    phone_row = f'<p>Phone: {customer_phone}</p>' if customer_phone else ''
    addr_row = f'<p>{customer_address}</p>' if customer_address else ''
    place_row = f'<p>{customer_place}</p>' if customer_place else ''
    disc_row = (f'<div class="sum-row discount"><span>Discount ({discount_pct}%)</span>'
                f'<span>-&#8377;{discount_amt:.2f}</span></div>') if discount_amt > 0 else ''

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
    @media (max-width:600px){{
      body{{padding:0;}}
      .invoice-page{{width:100%;min-height:auto;}}
      .inv-header{{flex-direction:column;gap:16px;}}
      .inv-title-block{{text-align:left;}}
      .bill-grid{{grid-template-columns:1fr;}}
      .items-table th,.items-table td{{padding:8px;font-size:11px;}}
    }}
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
      <p>For queries, contact us at {company_phone}{email_contact}</p>
      <p style="font-size:10px;margin-top:8px;color:#cbd5e1;">This is a computer-generated invoice and does not require a physical signature.</p>
    </div>
  </div>

  <script>
    document.fonts.ready.then(function() {{}});
  </script>
</body>
</html>"""

    return html
