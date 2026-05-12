
import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

from utils.constants import COMPANY_NAME, COMPANY_PHONE, COMPANY_ADDRESS, COMPANY_EMAIL, COMPANY_GSTIN
from utils.tzutils import format_ist_date, format_ist_time

def generate_invoice_pdf(invoice, company_info=None):
    """
    Generate a professional PDF invoice using ReportLab.
    Returns a BytesIO buffer containing the PDF data.
    """
    if company_info is None:
        company_info = {
            "name": COMPANY_NAME,
            "address": COMPANY_ADDRESS,
            "phone": COMPANY_PHONE,
            "email": COMPANY_EMAIL,
            "gstin": COMPANY_GSTIN
        }

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=20, leftMargin=20, topMargin=20, bottomMargin=20)
    elements = []
    styles = getSampleStyleSheet()

    # Custom Styles
    styles.add(ParagraphStyle(name='CompanyHeader', fontSize=22, fontName='Helvetica-Bold', textColor=colors.HexColor('#1e40af'), spaceAfter=5))
    styles.add(ParagraphStyle(name='CompanySub', fontSize=9, textColor=colors.grey, spaceAfter=2))
    styles.add(ParagraphStyle(name='InvoiceTitle', fontSize=24, fontName='Helvetica-Bold', alignment=TA_RIGHT, spaceAfter=10))
    styles.add(ParagraphStyle(name='MetaLabel', fontSize=9, textColor=colors.grey, alignment=TA_RIGHT))
    styles.add(ParagraphStyle(name='MetaValue', fontSize=10, fontName='Helvetica-Bold', alignment=TA_RIGHT))
    styles.add(ParagraphStyle(name='SectionTitle', fontSize=10, fontName='Helvetica-Bold', textColor=colors.HexColor('#1e40af'), spaceBefore=10, spaceAfter=5, textTransform='uppercase'))
    styles.add(ParagraphStyle(name='BillingInfo', fontSize=10, leading=14))
    styles.add(ParagraphStyle(name='BillingName', fontSize=12, fontName='Helvetica-Bold', leading=16))

    # --- Header ---
    # We use a table for the header to align company info left and invoice title right
    bill_number = invoice.get('billNumber', 'N/A')
    bill_date = invoice.get('billDate')
    bill_date_str = format_ist_date(bill_date) if bill_date else 'N/A'
    bill_time_str = format_ist_time(bill_date) if bill_date else ''

    header_data = [
        [
            [
                Paragraph(f"⚡ {company_info['name']}", styles['CompanyHeader']),
                Paragraph(company_info['address'], styles['CompanySub']),
                Paragraph(f"Phone: {company_info['phone']} | Email: {company_info['email']}", styles['CompanySub']),
                Paragraph(f"GSTIN: {company_info['gstin']}", styles['CompanySub']),
            ],
            [
                Paragraph("TAX INVOICE", styles['InvoiceTitle']),
                Paragraph("Invoice No:", styles['MetaLabel']),
                Paragraph(bill_number, styles['MetaValue']),
                Spacer(1, 2),
                Paragraph("Date:", styles['MetaLabel']),
                Paragraph(bill_date_str, styles['MetaValue']),
                Spacer(1, 2),
                Paragraph("Time:", styles['MetaLabel']),
                Paragraph(bill_time_str, styles['MetaValue']),
            ]
        ]
    ]

    header_table = Table(header_data, colWidths=[350, 180])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 15))

    # --- Billing and Payment Info ---
    customer_name = invoice.get('customerName', 'Walk-in Customer')
    customer_phone = invoice.get('customerPhone', '')
    customer_address = invoice.get('customerAddress', '')
    customer_place = invoice.get('customerPlace', '')
    payment_mode = str(invoice.get('paymentMode', 'cash')).capitalize()

    billing_data = [
        [
            [
                Paragraph("BILLED TO", styles['SectionTitle']),
                Paragraph(customer_name, styles['BillingName']),
                Paragraph(f"Phone: {customer_phone}" if customer_phone else "", styles['BillingInfo']),
                Paragraph(customer_address if customer_address else "", styles['BillingInfo']),
                Paragraph(customer_place if customer_place else "", styles['BillingInfo']),
            ],
            [
                Paragraph("PAYMENT INFO", styles['SectionTitle']),
                Paragraph(f"<b>Method:</b> {payment_mode}", styles['BillingInfo']),
                Paragraph(f"<b>Status:</b> <font color='#10b981'>PAID ✓</font>", styles['BillingInfo']),
            ]
        ]
    ]

    # Add EMI section if applicable
    emi_details = invoice.get('emiDetails')
    if invoice.get('paymentMode') == 'emi' and emi_details:
        emi_text = f"<b>Tenure:</b> {emi_details.get('months', 0)} Months<br/>"
        emi_text += f"<b>Monthly EMI:</b> ₹{float(emi_details.get('emiAmount', 0)):.2f}<br/>"
        emi_text += f"<b>Down Payment:</b> ₹{float(emi_details.get('downPayment', 0)):.2f}"
        billing_data[0][1].append(Spacer(1, 5))
        billing_data[0][1].append(Paragraph("EMI DETAILS", styles['SectionTitle']))
        billing_data[0][1].append(Paragraph(emi_text, styles['BillingInfo']))

    billing_table = Table(billing_data, colWidths=[300, 230])
    billing_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 15),
        ('RIGHTPADDING', (0, 0), (-1, -1), 15),
    ]))
    elements.append(billing_table)
    elements.append(Spacer(1, 20))

    # --- Items Table ---
    # Table Header
    items_data = [['#', 'ITEM DESCRIPTION', 'QTY', 'UNIT PRICE', 'AMOUNT']]
    
    # Table Content
    for idx, item in enumerate(invoice.get('items', []), 1):
        product_name = item.get('productName', 'Unknown')
        hsn = item.get('hsnCode', 'N/A')
        qty = item.get('quantity', 0)
        unit_price = float(item.get('unitPrice', 0))
        line_subtotal = float(item.get('lineSubtotal', 0))
        line_gst = float(item.get('lineGstAmount', 0))
        total = line_subtotal + line_gst
        
        # We can use Paragraph for item description to allow wrapping
        item_desc = [
            Paragraph(f"<b>{product_name}</b>", styles['Normal']),
            Paragraph(f"<font size='8' color='grey'>HSN: {hsn}</font>", styles['Normal'])
        ]
        
        items_data.append([
            idx,
            item_desc,
            f"{int(qty) if qty == int(qty) else qty}",
            f"₹{unit_price:.2f}",
            f"₹{total:.2f}"
        ])

    # Calculate Totals
    subtotal = float(invoice.get('subtotal', 0))
    discount_amt = float(invoice.get('discountAmount', 0))
    discount_pct = invoice.get('discountPercent', 0)
    cgst = float(invoice.get('cgst', 0))
    sgst = float(invoice.get('sgst', 0))
    igst = float(invoice.get('igst', 0))
    grand_total = float(invoice.get('grandTotal', 0))

    # Create Table
    items_table = Table(items_data, colWidths=[30, 280, 50, 80, 90])
    items_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#64748b')),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.2, colors.HexColor('#e2e8f0')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 10))

    # --- Summary Section ---
    summary_elements = []
    summary_elements.append([Paragraph("Subtotal", styles['Normal']), f"₹{subtotal:.2f}"])
    if discount_amt > 0:
        summary_elements.append([Paragraph(f"Discount ({discount_pct}%)", styles['Normal']), f"-₹{discount_amt:.2f}"])
    
    if cgst > 0:
        summary_elements.append([Paragraph("CGST (9%)", styles['Normal']), f"₹{cgst:.2f}"])
        summary_elements.append([Paragraph("SGST (9%)", styles['Normal']), f"₹{sgst:.2f}"])
    elif igst > 0:
        summary_elements.append([Paragraph("IGST (18%)", styles['Normal']), f"₹{igst:.2f}"])
    
    summary_elements.append([Paragraph("<b>Grand Total</b>", styles['Normal']), Paragraph(f"<b>₹{grand_total:.2f}</b>", styles['Normal'])])

    summary_table = Table(summary_elements, colWidths=[150, 80])
    summary_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('LINEABOVE', (0, -1), (-1, -1), 1, colors.black),
    ]))

    # Wrap summary table in another table for right alignment
    full_summary = Table([[None, summary_table]], colWidths=[300, 230])
    full_summary.setStyle(TableStyle([
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    elements.append(full_summary)

    # --- Footer ---
    elements.append(Spacer(1, 40))
    footer_style = ParagraphStyle(name='Footer', fontSize=10, textColor=colors.grey, alignment=TA_CENTER)
    elements.append(Paragraph("Thank you for your business!", ParagraphStyle(name='Thanks', fontSize=12, fontName='Helvetica-Bold', alignment=TA_CENTER, spaceAfter=5)))
    elements.append(Paragraph(f"For queries, contact us at {company_info['phone']} | {company_info['email']}", footer_style))
    elements.append(Spacer(1, 10))
    elements.append(Paragraph("This is a computer-generated invoice and does not require a physical signature.", ParagraphStyle(name='Generated', fontSize=8, textColor=colors.lightgrey, alignment=TA_CENTER)))

    doc.build(elements)
    buffer.seek(0)
    return buffer
