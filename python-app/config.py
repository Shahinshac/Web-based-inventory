"""
Configuration settings for the Flask Inventory Management System
"""
import os
from datetime import timedelta

class Config:
    # Secret key for session management
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Database configuration
    # Support DATABASE_URL for PostgreSQL (Railway, Heroku, etc.)
    DATABASE_URL = os.environ.get('DATABASE_URL')
    
    if DATABASE_URL:
        # Convert postgres:// to postgresql:// for SQLAlchemy compatibility
        if DATABASE_URL.startswith('postgres://'):
            DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
        DATABASE_PATH = DATABASE_URL
    elif os.environ.get('RENDER') or os.environ.get('RAILWAY_ENVIRONMENT'):
        # Use /tmp for ephemeral storage on Render/Railway with SQLite
        DATABASE_PATH = '/tmp/inventory.db'
    else:
        # Local development
        DATABASE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inventory.db')
    
    # Session settings
    PERMANENT_SESSION_LIFETIME = timedelta(hours=2)
    SESSION_COOKIE_SECURE = os.environ.get('FLASK_ENV') == 'production'
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # CSRF Protection
    WTF_CSRF_ENABLED = False  # Enable in production with proper setup
    
    # Application settings
    DEBUG = os.environ.get('FLASK_ENV') != 'production'
    TESTING = False
    
    # Company Info
    COMPANY_NAME = os.environ.get('COMPANY_NAME', '26:07 Electronics')
    COMPANY_ADDRESS = os.environ.get('COMPANY_ADDRESS', 'Electronics Plaza, Tech Street, City - 560001')
    COMPANY_PHONE = os.environ.get('COMPANY_PHONE', '7594012761')
    COMPANY_EMAIL = os.environ.get('COMPANY_EMAIL', 'support@2607electronics.com')
    COMPANY_GSTIN = os.environ.get('COMPANY_GSTIN', '29AABCU9603R1ZX')
    
    # GST Rate (18% standard)
    GST_RATE = 18.0
    
    # Upload folder
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads')
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10MB max upload
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
