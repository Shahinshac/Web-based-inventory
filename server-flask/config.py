import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask app config
    SECRET_KEY = os.environ.get('JWT_SECRET') or 'super-secret-python-key'
    DEBUG = False  # Disable debug mode to avoid reloader issues
    PORT = int(os.environ.get('PORT', 5000))

    # MongoDB Configuration
    # Uses MONGODB_URI environment variable (Atlas for production)
    # Falls back to local MongoDB in development if not provided
    MONGO_URI = os.environ.get('MONGODB_URI')
    if not MONGO_URI:
        if os.environ.get('FLASK_ENV') == 'production' or os.environ.get('RENDER') == 'true':
            raise ValueError("MONGODB_URI environment variable is required in production.")
        MONGO_URI = 'mongodb://localhost:27017/inventorydb'
    DB_NAME = os.environ.get('DB_NAME', 'inventorydb')

    # Cloudinary Integration
    CLOUDINARY_CLOUD_NAME = os.environ.get('CLOUDINARY_CLOUD_NAME')
    CLOUDINARY_API_KEY = os.environ.get('CLOUDINARY_API_KEY')
    CLOUDINARY_API_SECRET = os.environ.get('CLOUDINARY_API_SECRET')

    # Payment Configuration (UPI for payment links)
    COMPANY_UPI = os.environ.get('COMPANY_UPI', '7594012761@super')
    COMPANY_NAME = os.environ.get('COMPANY_NAME', '26:07 Electronics')
