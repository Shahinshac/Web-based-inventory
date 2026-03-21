import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask app config
    SECRET_KEY = os.environ.get('JWT_SECRET') or 'super-secret-python-key'
    DEBUG = False  # Disable debug mode to avoid reloader issues
    PORT = int(os.environ.get('PORT', 5000))

    # MongoDB config
    MONGO_URI = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/inventorydb')
    DB_NAME = os.environ.get('DB_NAME', 'inventorydb')

    # Cloudinary Integration
    CLOUDINARY_CLOUD_NAME = os.environ.get('CLOUDINARY_CLOUD_NAME')
    CLOUDINARY_API_KEY = os.environ.get('CLOUDINARY_API_KEY')
    CLOUDINARY_API_SECRET = os.environ.get('CLOUDINARY_API_SECRET')
