"""Customer service – business logic helpers."""

import io
import qrcode


def build_vcard(customer: dict) -> str:
    """Return a vCard 3.0 string for *customer*."""
    lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        f"FN:{customer.get('name', '')}",
    ]

    phone = customer.get('phone', '')
    if phone:
        lines.append(f"TEL;TYPE=CELL:{phone}")

    email = customer.get('email', '')
    if email:
        lines.append(f"EMAIL:{email}")

    company = customer.get('company', '')
    if company:
        lines.append(f"ORG:{company}")

    position = customer.get('position', '')
    if position:
        lines.append(f"TITLE:{position}")

    website = customer.get('website', '')
    if website:
        lines.append(f"URL:{website}")

    address = customer.get('address', '')
    place = customer.get('place', '') or customer.get('city', '')
    pincode = customer.get('pincode', '')
    country = customer.get('country', '')
    if address or place or pincode or country:
        # vCard ADR: post-office-box;extended-address;street;locality;region;postal-code;country
        lines.append(f"ADR:;;{address};{place};;{pincode};{country}")

    gstin = customer.get('gstin', '')
    if gstin:
        lines.append(f"X-GSTIN:{gstin}")

    lines.append("END:VCARD")
    return "\r\n".join(lines)


def build_pvc_card_pdf(customer: dict, company_name: str = '', company_phone: str = '') -> io.BytesIO:
    """Generate a credit-card sized PDF for *customer* and return a BytesIO buffer.

    Card dimensions: 85.6 mm × 54 mm (standard ISO 7810 ID-1 / credit card size).
    In points (1 pt = 1/72 inch ≈ 0.353 mm): 242.5 pt × 153.1 pt
    """
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.lib.colors import HexColor
    from reportlab.platypus import SimpleDocTemplate
    from reportlab.graphics.shapes import Drawing, Rect, String, Circle, Line
    from reportlab.graphics import renderPDF
    from reportlab.pdfgen import canvas as rl_canvas
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    CARD_W = 85.6 * mm
    CARD_H = 54.0 * mm

    buffer = io.BytesIO()
    c = rl_canvas.Canvas(buffer, pagesize=(CARD_W, CARD_H))

    # ── Background gradient simulation (white → light blue tint) ──
    # Draw a light background
    c.setFillColor(HexColor('#f0f4ff'))
    c.rect(0, 0, CARD_W, CARD_H, fill=1, stroke=0)

    # Accent bar at top (brand colour)
    c.setFillColor(HexColor('#2563eb'))
    c.rect(0, CARD_H - 8 * mm, CARD_W, 8 * mm, fill=1, stroke=0)

    # White card body below bar
    c.setFillColor(HexColor('#ffffff'))
    c.rect(0, 0, CARD_W, CARD_H - 8 * mm, fill=1, stroke=0)

    # Subtle bottom accent strip
    c.setFillColor(HexColor('#1e40af'))
    c.rect(0, 0, CARD_W, 2 * mm, fill=1, stroke=0)

    # ── Company name in accent bar ──
    c.setFillColor(HexColor('#ffffff'))
    c.setFont("Helvetica-Bold", 7)
    c.drawString(4 * mm, CARD_H - 5 * mm, (company_name or 'Company').upper()[:30])

    if company_phone:
        c.setFont("Helvetica", 5.5)
        c.setFillColor(HexColor('#bfdbfe'))
        c.drawRightString(CARD_W - 4 * mm, CARD_H - 5 * mm, company_phone)

    # ── Customer name ──
    name = customer.get('name', 'Customer')
    c.setFillColor(HexColor('#0f172a'))
    c.setFont("Helvetica-Bold", 9)
    # Truncate long names
    max_name = 24
    display_name = name if len(name) <= max_name else name[:max_name - 1] + '…'
    c.drawString(4 * mm, CARD_H - 15 * mm, display_name)

    # Position / title
    y_pos = CARD_H - 20 * mm
    if customer.get('position'):
        c.setFont("Helvetica-Oblique", 6.5)
        c.setFillColor(HexColor('#2563eb'))
        c.drawString(4 * mm, y_pos, customer['position'][:30])
        y_pos -= 4.5 * mm

    # Company / business name
    if customer.get('company'):
        c.setFont("Helvetica", 6.5)
        c.setFillColor(HexColor('#334155'))
        c.drawString(4 * mm, y_pos, customer['company'][:30])
        y_pos -= 4.5 * mm

    # Separator line
    sep_y = y_pos + 1 * mm
    c.setStrokeColor(HexColor('#e2e8f0'))
    c.setLineWidth(0.4)
    c.line(4 * mm, sep_y, CARD_W - 4 * mm, sep_y)
    y_pos -= 1.5 * mm

    # ── Contact details ──
    c.setFont("Helvetica", 6)
    c.setFillColor(HexColor('#475569'))

    def draw_contact(label: str, value: str, y: float) -> float:
        if not value:
            return y
        c.setFont("Helvetica-Bold", 5.5)
        c.setFillColor(HexColor('#94a3b8'))
        c.drawString(4 * mm, y, label + ':')
        c.setFont("Helvetica", 6)
        c.setFillColor(HexColor('#334155'))
        c.drawString(18 * mm, y, str(value)[:32])
        return y - 4 * mm

    y_pos = draw_contact('Ph', customer.get('phone', ''), y_pos)
    y_pos = draw_contact('Email', customer.get('email', ''), y_pos)

    address_parts = [p for p in [customer.get('address', ''), customer.get('place', ''), customer.get('pincode', '')] if p]
    if address_parts:
        y_pos = draw_contact('Addr', ', '.join(address_parts)[:35], y_pos)

    if customer.get('gstin'):
        y_pos = draw_contact('GSTIN', customer['gstin'], y_pos)

    # ── QR code (vCard) – right side ──
    vcard_data = build_vcard(customer)
    try:
        qr = qrcode.QRCode(version=None, box_size=4, border=1, error_correction=qrcode.constants.ERROR_CORRECT_M)
        qr.add_data(vcard_data)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white")
        qr_buffer = io.BytesIO()
        qr_img.save(qr_buffer, format='PNG')
        qr_buffer.seek(0)

        qr_size = 22 * mm
        qr_x = CARD_W - qr_size - 4 * mm
        qr_y = 4 * mm
        c.drawImage(
            qr_buffer,  # type: ignore[arg-type]
            qr_x, qr_y,
            width=qr_size, height=qr_size,
            preserveAspectRatio=True
        )
        # Label under QR
        c.setFont("Helvetica", 4.5)
        c.setFillColor(HexColor('#94a3b8'))
        c.drawCentredString(qr_x + qr_size / 2, qr_y - 3 * mm, 'Scan to save')
    except Exception:
        pass  # QR generation is optional

    c.save()
    buffer.seek(0)
    return buffer
