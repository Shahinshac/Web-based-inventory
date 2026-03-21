#!/usr/bin/env python3
"""
Script to update admin user credentials
"""
import bcrypt
from pymongo import MongoClient
from datetime import datetime

# MongoDB connection - Production Atlas
MONGO_URI = 'mongodb+srv://shahinshac123_db_user:41jUFKehGuWqR5a6@cluster0.majmsqd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
DB_NAME = 'inventorydb'

def update_admin_credentials():
    """Update admin user credentials"""
    try:
        # Connect to MongoDB
        client = MongoClient(MONGO_URI, tlsCAFile=__import__('certifi').where())
        db = client[DB_NAME]
        
        # New credentials
        new_username = "shahinsha"
        new_password = "262007"
        
        # Hash the password
        hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Check if shahinsha user already exists
        existing_shahinsha = db.users.find_one({"username": new_username})
        
        if existing_shahinsha:
            # Update existing shahinsha user
            print(f"User '{new_username}' already exists. Updating password...")
            result = db.users.update_one(
                {"username": new_username},
                {
                    "$set": {
                        "password": hashed_password,
                        "role": "admin",
                        "approved": True,
                        "sessionVersion": 1
                    }
                }
            )
            print("✅ Password updated successfully!")
            print(f"   Username: {new_username}")
            print(f"   New Password: {new_password}")
            
            # Delete old admin user if exists
            old_admin = db.users.find_one({"username": "admin"})
            if old_admin:
                db.users.delete_one({"username": "admin"})
                print(f"✅ Old 'admin' user removed")
        else:
            # Update admin to shahinsha
            result = db.users.update_one(
                {"username": "admin"},
                {
                    "$set": {
                        "username": new_username,
                        "password": hashed_password,
                        "sessionVersion": 1
                    }
                }
            )
            
            if result.matched_count > 0:
                print("✅ Admin credentials updated successfully!")
                print(f"   New Username: {new_username}")
                print(f"   New Password: {new_password}")
            else:
                # Create new admin user
                print("❌ Admin user not found. Creating new admin user...")
                admin_user = {
                    "username": new_username,
                    "password": hashed_password,
                    "email": "admin@2607electronics.com",
                    "role": "admin",
                    "approved": True,
                    "createdAt": datetime.utcnow(),
                    "createdBy": "system",
                    "lastLogin": None,
                    "sessionVersion": 1
                }
                
                db.users.insert_one(admin_user)
                print("✅ New admin user created successfully!")
                print(f"   Username: {new_username}")
                print(f"   Password: {new_password}")
        
        print(f"\n🔐 Please login with:")
        print(f"   Username: {new_username}")
        print(f"   Password: {new_password}")
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error updating admin credentials: {e}")

if __name__ == "__main__":
    update_admin_credentials()
