#!/usr/bin/env python3
"""
Script to reset admin password
"""
import bcrypt
from pymongo import MongoClient

# MongoDB connection
MONGO_URI = 'mongodb://localhost:27017/'
DB_NAME = 'inventorydb'

def reset_admin_password():
    """Reset admin password"""
    try:
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        
        # Find admin user
        admin_user = db.users.find_one({"username": "admin"})
        
        if not admin_user:
            print("❌ Admin user not found!")
            return
        
        # New password
        new_password = "admin123"
        
        # Hash the password
        hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Update password
        db.users.update_one(
            {"username": "admin"},
            {
                "$set": {"password": hashed_password},
                "$inc": {"sessionVersion": 1}
            }
        )
        
        print("✅ Admin password has been reset!")
        print(f"   Username: admin")
        print(f"   New Password: {new_password}")
        print("\n⚠️  IMPORTANT: Please change this password after logging in!")
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error resetting password: {e}")

if __name__ == "__main__":
    reset_admin_password()
