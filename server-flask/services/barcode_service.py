import logging
import base64

logger = logging.getLogger(__name__)

def generate_product_barcode(product_name, product_id):
    """
    Generate a simple textual barcode identifier based on product name and ID
    """
    prefix = 'PROD'
    id_part = str(product_id)[-8:] if len(str(product_id)) >= 8 else str(product_id)
    name_part = ''.join(e for e in str(product_name)[:3].upper() if e.isalnum())
    
    result = f"{prefix}{name_part}{id_part}"
    return result[:20]

def generate_barcode_image(barcode_value):
    """
    Generate a base64 encoded SVG barcode placeholder (matching legacy JS behavior)
    """
    try:
        logger.warning('Barcode generation not fully implemented - returning SVG placeholder')
        svg_content = f"""<svg width="200" height="80" xmlns="http://www.w3.org/2000/svg">
            <text x="10" y="40" font-family="monospace" font-size="14">{barcode_value}</text>
        </svg>"""
        
        b64_encoded = base64.b64encode(svg_content.encode('utf-8')).decode('utf-8')
        return f"data:image/svg+xml;base64,{b64_encoded}"
    except Exception as e:
        logger.error(f'Barcode generation error: {e}')
        raise Exception('Failed to generate barcode')

def generate_qr_code(data):
    """
    Generate a base64 encoded SVG QR placeholder (matching legacy JS behavior)
    """
    try:
        logger.warning('QR code generation not fully implemented - returning SVG placeholder')
        
        # Simple string representation of dict
        import json
        data_str = json.dumps(data)[:30]
        
        svg_content = f"""<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
            <rect width="200" height="200" fill="white"/>
            <text x="10" y="100" font-family="monospace" font-size="10">{data_str}</text>
        </svg>"""
        
        b64_encoded = base64.b64encode(svg_content.encode('utf-8')).decode('utf-8')
        return f"data:image/svg+xml;base64,{b64_encoded}"
    except Exception as e:
        logger.error(f'QR code generation error: {e}')
        raise Exception('Failed to generate QR code')
