import logging
import time
import cloudinary
import cloudinary.uploader
from flask import current_app

logger = logging.getLogger(__name__)

ALLOWED_MIME_TYPES = {'image/jpeg', 'image/jpg', 'image/png', 'image/webp'}
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB

def init_cloudinary(app):
    """Initialize Cloudinary SDK with app config."""
    cloud_name = app.config.get('CLOUDINARY_CLOUD_NAME')
    api_key = app.config.get('CLOUDINARY_API_KEY')
    api_secret = app.config.get('CLOUDINARY_API_SECRET')
    
    if cloud_name and api_key and api_secret:
        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret,
            secure=True
        )
        logger.info(f"✅ Cloudinary configured ✓ (cloud: {cloud_name})")
    else:
        logger.warning("⚠️ Cloudinary NOT configured. Set CLOUDINARY env vars.")

def is_configured():
    # If the module has credentials initialized
    config = cloudinary.config()
    return bool(config.cloud_name and config.api_key and config.api_secret)

def validate_file(file):
    """Validate a werkzeug FileStorage object."""
    if not file:
        raise ValueError('No file data received')
    
    if file.mimetype not in ALLOWED_MIME_TYPES:
        raise ValueError('Invalid file type. Allowed: JPG, PNG, WEBP')
    
    # Check file size by seeking to the end
    file.seek(0, 2)
    file_length = file.tell()
    file.seek(0) # reset
    
    if file_length > MAX_FILE_SIZE:
        raise ValueError('File too large. Maximum size is 2 MB')

def upload_buffer(file, folder, public_id=None, overwrite=True, width=800, height=800):
    if not is_configured():
        raise ValueError('Cloudinary is not configured. Missing API keys.')

    options = {
        "folder": folder,
        "resource_type": "image",
        "overwrite": overwrite,
        "transformation": [
            {
                "width": width,
                "height": height,
                "crop": "limit",
                "quality": "auto:good",
                "fetch_format": "auto"
            }
        ]
    }
    
    if public_id:
        options["public_id"] = public_id

    try:
        # Pass the FileStream directly
        result = cloudinary.uploader.upload(file, **options)
        return {
            "url": result.get("secure_url"),
            "publicId": result.get("public_id"),
            "width": result.get("width"),
            "height": result.get("height"),
            "bytes": result.get("bytes"),
            "format": result.get("format")
        }
    except Exception as e:
        logger.error(f"Cloudinary upload error: {e}")
        raise Exception(f"Cloudinary upload failed: {e}")

def upload_user_photo(file, user_id):
    validate_file(file)
    return upload_buffer(file, folder="inventory/users", public_id=user_id, overwrite=True, width=400, height=400)

def upload_product_photo(file, product_id):
    validate_file(file)
    unique_id = f"{product_id}-{int(time.time() * 1000)}"
    return upload_buffer(file, folder="inventory/products", public_id=unique_id, overwrite=False, width=800, height=800)

def delete_cloudinary_asset(public_id):
    if not public_id:
        return
    try:
        result = cloudinary.uploader.destroy(public_id)
        if result.get('result') not in ('ok', 'not found'):
            logger.warning(f"Cloudinary delete unexpected result for '{public_id}': {result}")
    except Exception as e:
        logger.warning(f"Failed to delete Cloudinary asset '{public_id}': {e}")
