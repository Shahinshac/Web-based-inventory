import sys
import bcrypt
import jwt
from datetime import datetime
old_path = sys.path.copy()
sys.path.append('.')

import config
from database import connect_db
from pymongo import MongoClient

class DummyApp:
    config = {'MONGO_URI': 'mongodb://localhost:27017/test_inventory', 'DB_NAME': 'test_inventory', 'SECRET_KEY': '123'}

app = DummyApp()
db = connect_db(app)

if db is None:
    print("No local DB, skipping.")
    sys.exit(0)

print("DB connected")

# Clean
db.users.delete_one({"username": "testuser"})

# Simulate req
password = "password123"
hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

user = {
    "username": "testuser",
    "password": hashed_password,
    "email": "test@test.com",
    "role": "cashier",
    "approved": True,
    "createdAt": datetime.utcnow(),
    "createdBy": "admin",
    "lastLogin": None,
    "sessionVersion": 1
}

try:
    result = db.users.insert_one(user)
    print("Inserted!", result.inserted_id)

    from services.audit_service import log_audit
    log_audit(db, "USER_CREATED_BY_ADMIN", "admin_id", "admin", {
        "newUserId": str(result.inserted_id),
        "newUsername": "testuser",
        "role": "cashier"
    })
    print("Audit logged")
except Exception as e:
    import traceback
    traceback.print_exc()
