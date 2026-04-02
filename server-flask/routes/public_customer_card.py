from datetime import datetime
from bson import ObjectId
from flask import Blueprint, request, jsonify
import qrcode
import io
import base64

from database import get_db
from utils.constants import COMPANY_NAME, COMPANY_PHONE
from utils.tzutils import utc_now, to_iso_string

public_customer_card_bp = Blueprint('public_customer_card', __name__)

# Public Customer Card View Route (No Authentication Required)
@public_customer_card_bp.route('/<token>', methods=['GET'])
def public_customer_card_view(token):
    """View public customer card by token (accessible without authentication)"""
    db = get_db()

    # Find the public link
    public_link = db.public_customer_cards.find_one({"token": token})

    if not public_link:
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Customer Card Not Found</title>
            <style>
                body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
                .error { text-align: center; padding: 40px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #e53e3e; }
            </style>
        </head>
        <body>
            <div class="error">
                <h1>❌ Customer Card Not Found</h1>
                <p>This customer card link is invalid or does not exist.</p>
            </div>
        </body>
        </html>
        """, 404

    # Check if expired
    if utc_now() > public_link.get('expiresAt'):
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
                <p>This customer card link has expired. Please request a new link.</p>
            </div>
        </body>
        </html>
        """, 410

    # Get the customer
    try:
        customer = db.customers.find_one({"_id": ObjectId(public_link.get('customerId'))})
    except Exception:
        customer = None

    if not customer:
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Customer Not Found</title>
            <style>
                body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
                .error { text-align: center; padding: 40px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #e53e3e; }
            </style>
        </head>
        <body>
            <div class="error">
                <h1>❌ Customer Not Found</h1>
                <p>The customer associated with this card could not be found.</p>
            </div>
        </body>
        </html>
        """, 404

    # Get company info from snapshot
    company = public_link.get('companySnapshot', {})

    # Generate vCard data for QR code
    vcard_data = f"""BEGIN:VCARD
VERSION:3.0
FN:{customer.get('name', '')}
TEL;TYPE=CELL:{customer.get('phone', '')}
{"EMAIL:" + customer.get('email') if customer.get('email') else ""}
{"ORG:" + customer.get('company') if customer.get('company') else ""}
{"TITLE:" + customer.get('position') if customer.get('position') else ""}
{"ADR;TYPE=WORK:;;" + customer.get('address', '') + ";" + customer.get('city', '') + ";;" + customer.get('pincode', '') + ";" + customer.get('country', '') if customer.get('address') else ""}
{"URL:" + customer.get('website') if customer.get('website') else ""}
END:VCARD"""

    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr.add_data(vcard_data)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")

    # Convert QR code to base64
    buffer = io.BytesIO()
    qr_img.save(buffer, format='PNG')
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()


    # PVC Card Style HTML with flip feature
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Customer Card - {customer.get('name', 'Customer')}</title>
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 20px;
            }}
            .card-container {{
                perspective: 1000px;
                max-width: 400px;
                width: 100%;
                cursor: pointer;
            }}
            .card-flipper {{
                position: relative;
                width: 100%;
                height: 100%;
                transition: transform 0.6s;
                transform-style: preserve-3d;
            }}
            .card-container.flipped .card-flipper {{
                transform: rotateY(180deg);
            }}
            .pvc-card {{
                background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
                border-radius: 16px;
                padding: 30px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                position: relative;
                overflow: hidden;
                border: 2px solid rgba(255,255,255,0.8);
                backface-visibility: hidden;
                -webkit-backface-visibility: hidden;
            }}
            .card-front, .card-back {{
                position: absolute;
                width: 100%;
                backface-visibility: hidden;
                -webkit-backface-visibility: hidden;
            }}
            .card-back {{
                transform: rotateY(180deg);
            }}
            .card-header {{
                text-align: center;
                margin-bottom: 25px;
                padding-bottom: 20px;
                border-bottom: 2px solid #e9ecef;
            }}
            .company-name {{
                font-size: 18px;
                font-weight: 700;
                color: #667eea;
                margin-bottom: 5px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }}
            .company-phone {{
                font-size: 12px;
                color: #6c757d;
            }}
            .customer-avatar {{
                width: 100px;
                height: 100px;
                margin: 0 auto 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 48px;
                color: white;
                font-weight: 700;
                box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
            }}
            .customer-name {{
                font-size: 24px;
                font-weight: 700;
                color: #2d3748;
                text-align: center;
                margin-bottom: 25px;
            }}
            .customer-details {{
                margin-top: 20px;
            }}
            .detail-row {{
                display: flex;
                align-items: flex-start;
                margin-bottom: 15px;
                padding: 12px;
                background: #f8f9fa;
                border-radius: 8px;
            }}
            .detail-icon {{
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 12px;
                flex-shrink: 0;
            }}
            .detail-content {{
                flex: 1;
            }}
            .detail-label {{
                font-size: 11px;
                color: #6c757d;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                font-weight: 600;
                margin-bottom: 4px;
            }}
            .detail-value {{
                font-size: 14px;
                color: #2d3748;
                font-weight: 600;
                word-break: break-word;
            }}
            .card-footer {{
                margin-top: 25px;
                padding-top: 20px;
                border-top: 2px solid #e9ecef;
                text-align: center;
                font-size: 11px;
                color: #6c757d;
            }}
            .pattern-overlay {{
                position: absolute;
                top: -50%;
                right: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(102, 126, 234, 0.05) 0%, transparent 70%);
                pointer-events: none;
            }}
            .qr-container {{
                text-align: center;
                padding: 20px;
            }}
            .qr-code {{
                width: 250px;
                height: 250px;
                margin: 20px auto;
                background: white;
                padding: 15px;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }}
            .qr-code img {{
                width: 100%;
                height: 100%;
                display: block;
            }}
            .qr-instruction {{
                font-size: 16px;
                color: #2d3748;
                margin: 20px 0;
                font-weight: 600;
            }}
            .qr-subtitle {{
                font-size: 12px;
                color: #6c757d;
                margin-bottom: 15px;
            }}
            .flip-hint {{
                position: absolute;
                bottom: 15px;
                left: 0;
                right: 0;
                text-align: center;
                font-size: 11px;
                color: #6c757d;
                animation: pulse 2s infinite;
            }}
            @keyframes pulse {{
                0%, 100% {{ opacity: 1; }}
                50% {{ opacity: 0.5; }}
            }}
            @media (max-width: 480px) {{
                .pvc-card {{ padding: 20px; }}
                .customer-name {{ font-size: 20px; }}
                .company-name {{ font-size: 16px; }}
            }}
        </style>
    </head>
    <body>
        <div class="card-container" onclick="this.classList.toggle('flipped')">
            <div class="card-flipper">
                <!-- Front of Card -->
                <div class="card-front">
                    <div class="pvc-card">
                        <div class="pattern-overlay"></div>

                        <div class="card-header">
                            <div class="company-name">{company.get('name', COMPANY_NAME)}</div>
                            <div class="company-phone">📞 {company.get('phone', COMPANY_PHONE)}</div>
                        </div>

                        <div class="customer-avatar">
                            {customer.get('name', 'C')[0].upper()}
                        </div>

                        <div class="customer-name">
                            {customer.get('name', 'Customer')}
                        </div>

                        <div class="customer-details">
                            {"" if not customer.get('phone') else f'''
                            <div class="detail-row">
                                <div class="detail-icon">📱</div>
                                <div class="detail-content">
                                    <div class="detail-label">Phone Number</div>
                                    <div class="detail-value">{customer.get('phone')}</div>
                                </div>
                            </div>
                            '''}

                            {"" if not customer.get('email') else f'''
                            <div class="detail-row">
                                <div class="detail-icon">📧</div>
                                <div class="detail-content">
                                    <div class="detail-label">Email</div>
                                    <div class="detail-value">{customer.get('email')}</div>
                                </div>
                            </div>
                            '''}

                            {"" if not customer.get('company') else f'''
                            <div class="detail-row">
                                <div class="detail-icon">🏢</div>
                                <div class="detail-content">
                                    <div class="detail-label">Company</div>
                                    <div class="detail-value">{customer.get('company')}</div>
                                </div>
                            </div>
                            '''}

                            {"" if not customer.get('position') else f'''
                            <div class="detail-row">
                                <div class="detail-icon">💼</div>
                                <div class="detail-content">
                                    <div class="detail-label">Position</div>
                                    <div class="detail-value">{customer.get('position')}</div>
                                </div>
                            </div>
                            '''}

                            {"" if not customer.get('place') else f'''
                            <div class="detail-row">
                                <div class="detail-icon">📍</div>
                                <div class="detail-content">
                                    <div class="detail-label">Location</div>
                                    <div class="detail-value">{customer.get('place')}{" - " + customer.get('pincode') if customer.get('pincode') else ""}</div>
                                </div>
                            </div>
                            '''}

                            {"" if not customer.get('address') else f'''
                            <div class="detail-row">
                                <div class="detail-icon">🏠</div>
                                <div class="detail-content">
                                    <div class="detail-label">Address</div>
                                    <div class="detail-value">{customer.get('address')}</div>
                                </div>
                            </div>
                            '''}

                            {"" if not customer.get('website') else f'''
                            <div class="detail-row">
                                <div class="detail-icon">🌐</div>
                                <div class="detail-content">
                                    <div class="detail-label">Website</div>
                                    <div class="detail-value">{customer.get('website')}</div>
                                </div>
                            </div>
                            '''}

                            {"" if not customer.get('gstin') else f'''
                            <div class="detail-row">
                                <div class="detail-icon">🏆</div>
                                <div class="detail-content">
                                    <div class="detail-label">GSTIN</div>
                                    <div class="detail-value">{customer.get('gstin')}</div>
                                </div>
                            </div>
                            '''}
                        </div>

                        <div class="card-footer">
                            <p>Valued Customer</p>
                            <p style="margin-top: 5px; font-style: italic; opacity: 0.7;">
                                Thank you for choosing us!
                            </p>
                        </div>

                        <div class="flip-hint">
                            💡 Tap to see QR Code
                        </div>
                    </div>
                </div>

                <!-- Back of Card -->
                <div class="card-back">
                    <div class="pvc-card">
                        <div class="pattern-overlay"></div>

                        <div class="card-header">
                            <div class="company-name">{company.get('name', COMPANY_NAME)}</div>
                            <div class="company-phone">📞 {company.get('phone', COMPANY_PHONE)}</div>
                        </div>

                        <div class="qr-container">
                            <div class="qr-instruction">Scan to Save Contact</div>
                            <div class="qr-subtitle">Use your phone's camera to scan</div>

                            <div class="qr-code">
                                <img src="data:image/png;base64,{qr_base64}" alt="QR Code" />
                            </div>

                            <div class="customer-name" style="margin-top: 15px;">
                                {customer.get('name', 'Customer')}
                            </div>
                        </div>

                        <div class="flip-hint">
                            💡 Tap to flip back
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

    return html
