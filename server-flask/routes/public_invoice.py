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

    # Format the invoice HTML
    bill_date = invoice.get('billDate')
    if isinstance(bill_date, datetime):
        bill_date_str = bill_date.strftime('%d %b %Y, %I:%M %p')
    else:
        bill_date_str = str(bill_date)

    items_html = ""
    for idx, item in enumerate(invoice.get('items', []), 1):
        gst_pct = item.get('gstPercent', 18)
        line_subtotal = item.get('lineSubtotal', 0)
        line_gst = item.get('lineGstAmount', 0)
        items_html += f"""
        <tr>
            <td>{idx}</td>
            <td>{item.get('productName', 'Unknown')}</td>
            <td>{item.get('hsnCode', 'N/A')}</td>
            <td>{item.get('quantity', 0)}</td>
            <td>₹{item.get('unitPrice', 0):.2f}</td>
            <td>{gst_pct}%</td>
            <td>₹{line_gst:.2f}</td>
            <td>₹{(line_subtotal + line_gst):.2f}</td>
        </tr>
        """

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice {invoice.get('billNumber', '')}</title>
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; padding: 20px; }}
            .container {{ max-width: 800px; margin: 0 auto; background: white; box-shadow: 0 4px 20px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }}
            .header h1 {{ margin-bottom: 5px; font-size: 28px; }}
            .header p {{ opacity: 0.9; }}
            .invoice-details {{ padding: 30px; }}
            .section {{ margin-bottom: 25px; }}
            .section-title {{ font-size: 14px; font-weight: 600; color: #667eea; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }}
            .info-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }}
            .info-item {{ padding: 12px; background: #f8f9fa; border-radius: 6px; }}
            .info-label {{ font-size: 12px; color: #6c757d; margin-bottom: 4px; }}
            .info-value {{ font-weight: 600; color: #2d3748; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
            thead {{ background: #f8f9fa; }}
            th {{ padding: 12px; text-align: left; font-size: 12px; color: #6c757d; font-weight: 600; border-bottom: 2px solid #e9ecef; }}
            td {{ padding: 12px; border-bottom: 1px solid #e9ecef; color: #2d3748; }}
            tbody tr:hover {{ background: #f8f9fa; }}
            .totals {{ background: #f8f9fa; padding: 20px; margin-top: 20px; border-radius: 6px; }}
            .total-row {{ display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }}
            .total-row.grand {{ font-size: 18px; font-weight: 700; color: #667eea; border-top: 2px solid #667eea; padding-top: 12px; margin-top: 12px; }}
            .footer {{ background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 13px; }}
            @media print {{ body {{ background: white; padding: 0; }} .container {{ box-shadow: none; }} }}
            @media (max-width: 600px) {{ .info-grid {{ grid-template-columns: 1fr; }} th, td {{ padding: 8px; font-size: 12px; }} }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📄 INVOICE</h1>
                <p>{invoice.get('billNumber', 'N/A')}</p>
            </div>

            <div class="invoice-details">
                <div class="section">
                    <div class="section-title">Company Information</div>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Company Name</div>
                            <div class="info-value">{company.get('name', COMPANY_NAME)}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Phone</div>
                            <div class="info-value">{company.get('phone', COMPANY_PHONE)}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Email</div>
                            <div class="info-value">{company.get('email', COMPANY_EMAIL)}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">GSTIN</div>
                            <div class="info-value">{company.get('gstin', COMPANY_GSTIN)}</div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">Customer Information</div>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Customer Name</div>
                            <div class="info-value">{invoice.get('customerName', 'Walk-in Customer')}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Phone</div>
                            <div class="info-value">{invoice.get('customerPhone', 'N/A')}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Date</div>
                            <div class="info-value">{bill_date_str}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Payment Mode</div>
                            <div class="info-value">{invoice.get('paymentMode', 'Cash').upper()}</div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">Invoice Items</div>
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Product</th>
                                <th>HSN</th>
                                <th>Qty</th>
                                <th>Base Price</th>
                                <th>GST%</th>
                                <th>GST Amt</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items_html}
                        </tbody>
                    </table>
                </div>

                <div class="totals">
                    <div class="total-row">
                        <span>Subtotal (before discount):</span>
                        <span>₹{invoice.get('subtotal', 0):.2f}</span>
                    </div>
                    <div class="total-row">
                        <span>Discount ({invoice.get('discountPercent', 0)}%):</span>
                        <span>- ₹{invoice.get('discountAmount', 0):.2f}</span>
                    </div>
                    <div class="total-row">
                        <span>Taxable Amount:</span>
                        <span>₹{invoice.get('afterDiscount', 0):.2f}</span>
                    </div>
                    {"<div class='total-row'><span>CGST:</span><span>₹" + f"{invoice.get('cgst', 0):.2f}" + "</span></div>" if invoice.get('cgst', 0) > 0 else ""}
                    {"<div class='total-row'><span>SGST:</span><span>₹" + f"{invoice.get('sgst', 0):.2f}" + "</span></div>" if invoice.get('sgst', 0) > 0 else ""}
                    {"<div class='total-row'><span>IGST:</span><span>₹" + f"{invoice.get('igst', 0):.2f}" + "</span></div>" if invoice.get('igst', 0) > 0 else ""}
                    <div class="total-row">
                        <span>Total GST:</span>
                        <span>₹{invoice.get('gstAmount', 0):.2f}</span>
                    </div>
                    <div class="total-row grand">
                        <span>GRAND TOTAL:</span>
                        <span>₹{invoice.get('grandTotal', 0):.2f}</span>
                    </div>
                </div>
            </div>

            <div class="footer">
                <p>Thank you for your business!</p>
                <p style="margin-top: 8px; font-size: 11px; opacity: 0.7;">
                    This is a computer-generated invoice and does not require a signature.
                </p>
            </div>
        </div>
    </body>
    </html>
    """

    return html
