#!/usr/bin/env python3
"""
Script to list all users in the database
"""
from pymongo import MongoClient

# MongoDB connection
MONGO_URI = 'mongodb://localhost:27017/'
DB_NAME = 'inventorydb'

def list_users():
    """List all users in the database"""
    try:
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        
        users = db.users.find({}, {"username": 1, "email": 1, "role": 1, "approved": 1})
        
        print("\n📋 Users in database:")
        print("-" * 70)
        for user in users:
            print(f"Username: {user.get('username', 'N/A')}")
            print(f"Email: {user.get('email', 'N/A')}")
            print(f"Role: {user.get('role', 'N/A')}")
            print(f"Approved: {user.get('approved', False)}")
            print(f"ID: {user.get('_id')}")
            print("-" * 70)
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error listing users: {e}")

if __name__ == "__main__":
    list_users()
