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

    # Flask-Mail Configuration (for Customer OTP via Email)
    # Required for email-based OTP authentication
    # Gmail: Use App Password (https://support.google.com/accounts/answer/185833)
    # On Render: Set these env variables
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', True)
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', 'noreply@2607electronics.com')
