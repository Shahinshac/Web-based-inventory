import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask app config
    SECRET_KEY = os.environ.get('JWT_SECRET') or 'super-secret-python-key'
    DEBUG = False  # Disable debug mode to avoid reloader issues
    PORT = int(os.environ.get('PORT', 5000))

    # MongoDB Atlas Configuration (Cloud Database - REQUIRED)
    # Must be set via environment variable
    # NO localhost fallback - Atlas is mandatory
    # Production: Uses MONGODB_URI from Render environment variables
    MONGO_URI = os.environ.get('MONGODB_URI')
    if not MONGO_URI:
        raise ValueError("MONGODB_URI environment variable is required. Please set your Atlas connection string.")
    DB_NAME = os.environ.get('DB_NAME', 'inventorydb')

    # Cloudinary Integration
    CLOUDINARY_CLOUD_NAME = os.environ.get('CLOUDINARY_CLOUD_NAME')
    CLOUDINARY_API_KEY = os.environ.get('CLOUDINARY_API_KEY')
    CLOUDINARY_API_SECRET = os.environ.get('CLOUDINARY_API_SECRET')

    # Payment Configuration (UPI for payment links)
    COMPANY_UPI = os.environ.get('COMPANY_UPI', '7594012761@super')
    COMPANY_NAME = os.environ.get('COMPANY_NAME', '26:07 Electronics')
