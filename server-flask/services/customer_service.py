"""Customer service – business logic helpers."""


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
