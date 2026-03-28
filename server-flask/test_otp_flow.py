"""Test Complete OTP Flow"""
import os
from dotenv import load_dotenv
from flask import Flask
from flask_mail import Mail
from pymongo import MongoClient
from config import Config

load_dotenv()

app = Flask(__name__)
app.config.from_object(Config)

# Initialize mail
Mail(app)

# Initialize database connection
from database import connect_db
connect_db(app)

print("=" * 60)
print("TESTING COMPLETE OTP FLOW")
print("=" * 60)

# Test email
test_email = os.environ.get('MAIL_USERNAME', 'your-test-email@gmail.com')

print(f"\n1. Testing with email: {test_email}")
print("-" * 60)

# Step 1: Generate OTP
print("Step 1: Generating OTP...")
from services.otp_service import generate_otp, store_otp, send_otp_email

otp = generate_otp()
print(f"   Generated OTP: {otp} ✅")

# Step 2: Store OTP in MongoDB
print("\nStep 2: Storing OTP in MongoDB...")
with app.app_context():
    stored = store_otp(test_email, otp)
    if stored:
        print(f"   OTP stored in database ✅")
    else:
        print(f"   Failed to store OTP ❌")
        exit(1)

# Step 3: Send OTP Email
print("\nStep 3: Sending OTP via email...")
with app.app_context():
    sent = send_otp_email(test_email, otp, 'login')
    if sent:
        print(f"   Email sent successfully ✅")
        print(f"   Check your inbox at: {test_email}")
    else:
        print(f"   Failed to send email ❌")
        exit(1)

# Step 4: Verify OTP in MongoDB
print("\nStep 4: Verifying OTP in MongoDB...")
from database import get_db

with app.app_context():
    db = get_db()
    otp_record = db.otp_codes.find_one({"email": test_email})
    if otp_record:
        print(f"   OTP found in database ✅")
        print(f"   OTP: {otp_record['otp']}")
        print(f"   Expires: {otp_record['expires_at']}")
    else:
        print(f"   OTP not found in database ❌")
        exit(1)

print("\n" + "=" * 60)
print("✅ COMPLETE OTP FLOW TEST PASSED!")
print("=" * 60)
print("\nOTP Setup is working correctly:")
print("✅ OTP generated")
print("✅ OTP stored in MongoDB")
print("✅ Email sent successfully")
print("✅ Customer can now receive OTP codes")