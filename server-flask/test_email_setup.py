"""Test Email OTP Setup"""
import os
from dotenv import load_dotenv
from flask import Flask
from flask_mail import Mail, Message

load_dotenv()

app = Flask(__name__)

# Load email configuration
app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.environ.get('MAIL_USE_TLS', True)
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER')

print("=" * 60)
print("EMAIL CONFIGURATION TEST")
print("=" * 60)

# Check if configured
if not app.config['MAIL_USERNAME'] or not app.config['MAIL_PASSWORD']:
    print("❌ ERROR: Email not configured in .env file")
    print("   Please set MAIL_USERNAME and MAIL_PASSWORD")
    exit(1)

print(f"✅ MAIL_SERVER: {app.config['MAIL_SERVER']}")
print(f"✅ MAIL_PORT: {app.config['MAIL_PORT']}")
print(f"✅ MAIL_USE_TLS: {app.config['MAIL_USE_TLS']}")
print(f"✅ MAIL_USERNAME: {app.config['MAIL_USERNAME']}")
print(f"✅ MAIL_DEFAULT_SENDER: {app.config['MAIL_DEFAULT_SENDER']}")

# Initialize mail
mail = Mail(app)

print("\nAttempting to send test email...")
print("-" * 60)

with app.app_context():
    try:
        # Create test message
        msg = Message(
            subject='Test OTP Email - 26:07 Electronics',
            recipients=[app.config['MAIL_USERNAME']],  # Send to yourself
            body='Test OTP: 123456\n\nIf this email arrived, your OTP setup is working!',
            html='''<html>
                <body style="font-family: Arial, sans-serif;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #2563eb;">Test OTP Email</h2>
                        <p>Hello,</p>
                        <p>This is a test email to verify your OTP setup.</p>
                        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                            <h1 style="color: #0f172a; letter-spacing: 2px;">123456</h1>
                        </div>
                        <p><strong>If this email arrived, your OTP setup is working! ✅</strong></p>
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                        <p style="color: #666; font-size: 12px;">Best regards,<br>26:07 Electronics Team</p>
                    </div>
                </body>
            </html>'''
        )

        # Send the email
        mail.send(msg)

        print("✅ SUCCESS! Test email sent successfully!")
        print(f"   Check your inbox at: {app.config['MAIL_USERNAME']}")
        print("-" * 60)

    except Exception as e:
        print(f"❌ ERROR: Failed to send email")
        print(f"   {type(e).__name__}: {str(e)}")
        print("-" * 60)
        print("\nTroubleshooting:")
        print("1. Check MAIL_USERNAME and MAIL_PASSWORD in .env")
        print("2. Ensure 2-Step Verification is enabled on Gmail")
        print("3. Use App Password, not regular password")
        print("4. Check if Gmail allows less secure apps")
        exit(1)