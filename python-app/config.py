"""
Configuration settings for the Flask Inventory Management System
"""
import os
from datetime import timedelta

class Config:
    # Secret key for session management
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Database
    DATABASE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inventory.db')
    
    # Session settings
    PERMANENT_SESSION_LIFETIME = timedelta(hours=12)
    
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
