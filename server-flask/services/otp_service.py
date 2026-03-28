"""OTP service for customer authentication"""

import random
import string
from datetime import datetime, timedelta
from database import get_db

def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    return ''.join(random.choices(string.digits, k=6))

def store_otp(email: str, otp: str, expiry_minutes: int = 10) -> bool:
    """Store OTP in database with expiry"""
    try:
        db = get_db()
        expiry_time = datetime.utcnow() + timedelta(minutes=expiry_minutes)

        # Store OTP (replace if exists)
        db.otp_codes.update_one(
            {"email": email},
            {
                "$set": {
                    "email": email,
                    "otp": otp,
                    "created_at": datetime.utcnow(),
                    "expires_at": expiry_time,
                    "attempts": 0
                }
            },
            upsert=True
        )
        return True
    except Exception as e:
        print(f"Error storing OTP: {e}")
        return False

def verify_otp(email: str, otp: str, max_attempts: int = 5) -> dict:
    """Verify OTP and return result"""
    try:
        db = get_db()
        otp_record = db.otp_codes.find_one({"email": email})

        if not otp_record:
            return {"valid": False, "error": "No OTP found. Please request a new one."}

        # Check if expired
        if datetime.utcnow() > otp_record.get("expires_at", datetime.utcnow()):
            db.otp_codes.delete_one({"email": email})
            return {"valid": False, "error": "OTP has expired. Please request a new one."}

        # Check attempts
        attempts = otp_record.get("attempts", 0)
        if attempts >= max_attempts:
            db.otp_codes.delete_one({"email": email})
            return {"valid": False, "error": "Too many failed attempts. Please request a new OTP."}

        # Verify OTP
        if otp_record.get("otp") != otp:
            db.otp_codes.update_one(
                {"email": email},
                {"$inc": {"attempts": 1}}
            )
            remaining = max_attempts - attempts - 1
            error_msg = f"Invalid OTP. {remaining} attempts remaining."
            return {"valid": False, "error": error_msg}

        # OTP valid - delete it
        db.otp_codes.delete_one({"email": email})
        return {"valid": True}

    except Exception as e:
        print(f"Error verifying OTP: {e}")
        return {"valid": False, "error": "Verification failed"}

def send_otp_email(email: str, otp: str, otp_type: str = 'login') -> bool:
    """Send OTP via email using Flask-Mail"""
    try:
        from flask import current_app
        from flask_mail import Mail, Message
        import logging

        logger = logging.getLogger(__name__)

        # Check mail configuration
        if not current_app.config.get('MAIL_USERNAME') or not current_app.config.get('MAIL_PASSWORD'):
            logger.error("Mail credentials not configured")
            return False

        # Initialize or get mail instance
        mail = None
        if 'mail' not in current_app.extensions:
            mail = Mail(current_app)
        else:
            mail = current_app.extensions['mail']

        subject = "Your OTP for Login" if otp_type == 'login' else "Your OTP for Registration"

        body = f"""
Hello,

Your One-Time Password (OTP) for {otp_type} is:

    {otp}

This OTP will expire in 10 minutes.

If you didn't request this OTP, please ignore this email.

Best regards,
26:07 Electronics Team
"""

        html_body = f"""
<html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Your OTP for {otp_type}</h2>
            <p>Hello,</p>
            <p>Your One-Time Password (OTP) is:</p>
            <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                <h1 style="color: #0f172a; letter-spacing: 2px; margin: 0;">{otp}</h1>
            </div>
            <p><strong>This OTP will expire in 10 minutes.</strong></p>
            <p style="color: #666; font-size: 12px;">If you didn't request this OTP, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">Best regards,<br>26:07 Electronics Team</p>
        </div>
    </body>
</html>
"""

        msg = Message(
            subject=subject,
            recipients=[email],
            body=body,
            html=html_body
        )

        mail.send(msg)
        logger.info(f"OTP email sent to {email}")
        return True

    except Exception as e:
        logger.error(f"Error sending OTP email: {e}", exc_info=True)
        return False
