#!/usr/bin/env python3
"""
Script to create an admin user in the inventory database
"""
import bcrypt
from pymongo import MongoClient
from datetime import datetime

# MongoDB connection
MONGO_URI = 'mongodb+srv://shahinshac123_db_user:41jUFKehGuWqR5a6@cluster0.majmsqd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
DB_NAME = 'inventorydb'

def create_admin_user():
    """Create an admin user in the database"""
    try:
        # Connect to MongoDB
        client = MongoClient(MONGO_URI, tlsCAFile=__import__('certifi').where())
        db = client[DB_NAME]
        
        # Check if admin user already exists
        existing_admin = db.users.find_one({"username": "admin"})
        if existing_admin:
            print("✅ Admin user already exists!")
            print(f"   Username: admin")
            print(f"   Role: {existing_admin.get('role')}")
            print(f"   Approved: {existing_admin.get('approved')}")
            return
        
        # Create admin user
        username = "admin"
        password = "admin123"  # Default password - should be changed after first login
        email = "admin@2607electronics.com"
        
        # Hash the password
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Create user document
        admin_user = {
            "username": username,
            "password": hashed_password,
            "email": email,
            "role": "admin",
            "approved": True,
            "createdAt": datetime.utcnow(),
            "createdBy": "system",
            "lastLogin": None,
            "sessionVersion": 1
        }
        
        # Insert into database
        result = db.users.insert_one(admin_user)
        
        print("✅ Admin user created successfully!")
        print(f"   Username: {username}")
        print(f"   Password: {password}")
        print(f"   Email: {email}")
        print(f"   Role: admin")
        print(f"   User ID: {result.inserted_id}")
        print("\n⚠️  IMPORTANT: Please change the password after first login!")
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")

if __name__ == "__main__":
    create_admin_user()
