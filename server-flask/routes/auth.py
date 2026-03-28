import bcrypt
import logging
import jwt
from datetime import datetime, timedelta
from bson import ObjectId
from flask import Blueprint, request, jsonify, current_app, g

from database import get_db
from utils.auth_middleware import authenticate_token, require_admin
from services.audit_service import log_audit

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """Deprecated: Self registration is disabled"""
    return jsonify({"error": "Self-registration is disabled. Please contact your admin to create an account."}), 403

@auth_bp.route('/create', methods=['POST'])
@authenticate_token
@require_admin
def create_user():
    data = request.get_json()
    username = data.get('username', '').lower()
    password = data.get('password')
    email = data.get('email', '').strip().lower()
    if not email:
        email = None
    role = data.get('role', 'cashier')

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    if len(username) < 3:
        return jsonify({"error": "Username must be at least 3 characters"}), 400

    db = get_db()
    if db.users.find_one({"username": username}):
        return jsonify({"error": "Username already taken"}), 400

    valid_roles = ['admin', 'manager', 'cashier']
    assigned_role = role if role in valid_roles else 'cashier'

    # Hash the password with bcrypt
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    user = {
        "username": username,
        "password": hashed_password,
        "email": email,
        "role": assigned_role,
        "approved": True, # Straight to true for admin creations
        "createdAt": datetime.utcnow(),
        "createdBy": g.user.get('username'),
        "lastLogin": None,
        "sessionVersion": 1
    }

    result = db.users.insert_one(user)

    log_audit(db, "USER_CREATED_BY_ADMIN", g.user.get('userId'), g.user.get('username'), {
        "newUserId": str(result.inserted_id),
        "newUsername": username,
        "role": assigned_role
    })

    return jsonify({
        "success": True,
        "message": f"User '{username}' created successfully as {assigned_role}",
        "user": {
            "id": str(result.inserted_id),
            "username": username,
            "email": email,
            "role": assigned_role,
            "approved": True
        }
    })

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username', '').lower()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    db = get_db()
    user = db.users.find_one({"username": username})

    if not user:
        return jsonify({"error": "Invalid username or password"}), 401
    
    # Check password match
    if not bcrypt.checkpw(password.encode('utf-8'), str(user['password']).encode('utf-8')):
        return jsonify({"error": "Invalid username or password"}), 401
    
    if not user.get('approved', False):
        return jsonify({"error": "Your account is disabled. Please contact your admin.", "approved": False}), 403

    # Update last login
    db.users.update_one({"_id": user['_id']}, {"$set": {"lastLogin": datetime.utcnow()}})

    # Audit
    ip_addr = request.headers.get('X-Forwarded-For', request.remote_addr)
    log_audit(db, "USER_LOGIN", str(user['_id']), user['username'], {
        "role": user.get('role'),
        "ip": ip_addr
    })

    session_version = user.get('sessionVersion', 1)

    # Issue JWT token! Match the Node.js payload precisely
    token_payload = {
        "userId": str(user['_id']),
        "username": user['username'],
        "role": user.get('role'),
        "sessionVersion": session_version,
        "exp": datetime.utcnow() + timedelta(days=7) # Equivalent to 7d in node
    }
    
    token = jwt.encode(token_payload, current_app.config['SECRET_KEY'], algorithm='HS256')

    photo_url = user.get('photo')
    if user.get('photoStorage') != 'cloudinary' and photo_url:
        photo_url = f"/api/users/{str(user['_id'])}/photo"

    return jsonify({
        "success": True,
        "token": token,
        "user": {
            "id": str(user['_id']),
            "username": user['username'],
            "email": user.get('email', ''),
            "role": user.get('role'),
            "approved": user.get('approved'),
            "sessionVersion": session_version,
            "photo": photo_url
        }
    })

@auth_bp.route('/logout', methods=['POST'])
def logout():
    data = request.get_json() or {}
    user_id = data.get('userId')
    username = data.get('username')

    if user_id and username:
        db = get_db()
        ip_addr = request.headers.get('X-Forwarded-For', request.remote_addr)
        log_audit(db, "USER_LOGOUT", user_id, username, {"ip": ip_addr})

    return jsonify({"success": True, "message": "Logged out successfully"})

@auth_bp.route('/session', methods=['GET'])
@authenticate_token
def verify_session():
    db = get_db()
    user = db.users.find_one({"_id": ObjectId(g.user.get('userId'))})
    
    if not user:
        return jsonify({"valid": False, "error": "User not found"}), 404

    photo_url = user.get('photo')
    if user.get('photoStorage') != 'cloudinary' and photo_url:
        photo_url = f"/api/users/{str(user['_id'])}/photo"

    return jsonify({
        "valid": True, 
        "user": {
            "id": str(user['_id']),
            "username": user['username'],
            "email": user.get('email', ''),
            "role": user.get('role'),
            "approved": user.get('approved'),
            "sessionVersion": user.get('sessionVersion', 1),
            "photo": photo_url
        }
    })

@auth_bp.route('/', methods=['GET'])
@authenticate_token
@require_admin
def get_all_users():
    page = max(1, int(request.args.get('page', 1)))
    limit = min(max(1, int(request.args.get('limit', 200))), 500)
    skip = (page - 1) * limit

    db = get_db()
    users_cursor = db.users.find().sort("createdAt", -1).skip(skip).limit(limit)
    total = db.users.count_documents({})

    formatted_users = []
    for u in users_cursor:
        uid = str(u['_id'])
        photo = u.get('photo')
        if u.get('photoStorage') != 'cloudinary' and photo:
            photo = f"/api/users/{uid}/photo"

        formatted_users.append({
            "id": uid,
            "_id": uid,
            "username": u.get('username'),
            "email": u.get('email', ''),
            "role": u.get('role'),
            "photo": photo,
            "approved": u.get('approved', False),
            "sessionVersion": u.get('sessionVersion', 1),
            "createdAt": u.get('createdAt'),
            "lastLogin": u.get('lastLogin')
        })

    response = jsonify(formatted_users)
    response.headers['X-Total-Count'] = str(total)
    return response

@auth_bp.route('/check/<id>', methods=['GET'])
def check_user(id):
    db = get_db()
    user = db.users.find_one({"_id": ObjectId(id)})
    if not user:
        return jsonify({"exists": False, "approved": False, "message": "User account not found"})
    return jsonify({"exists": True, "approved": user.get('approved', False), "username": user.get('username')})

@auth_bp.route('/<username>/session', methods=['GET'])
@authenticate_token
def get_user_session_version(username):
    db = get_db()
    user = db.users.find_one({"username": username.lower()})
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"username": user['username'], "sessionVersion": user.get('sessionVersion', 1)})

@auth_bp.route('/<id>/approve', methods=['PATCH'])
@authenticate_token
@require_admin
def approve_user(id):
    data = request.get_json() or {}
    role = data.get('role')
    valid_roles = ['admin', 'manager', 'cashier']
    assigned_role = role if role in valid_roles else 'cashier'

    db = get_db()
    db.users.update_one({"_id": ObjectId(id)}, {"$set": {"approved": True, "role": assigned_role}})
    logger.info(f"User {id} approved with role {assigned_role}")

    return jsonify({"success": True, "message": f"User approved as {assigned_role}", "role": assigned_role})

@auth_bp.route('/<id>/unapprove', methods=['PATCH'])
@authenticate_token
@require_admin
def unapprove_user(id):
    db = get_db()
    db.users.update_one({"_id": ObjectId(id)}, {"$set": {"approved": False}})
    return jsonify({"success": True, "message": "User access revoked successfully"})

@auth_bp.route('/<id>/role', methods=['PATCH'])
@authenticate_token
@require_admin
def change_role(id):
    data = request.get_json() or {}
    role = data.get('role')
    valid_roles = ['admin', 'manager', 'cashier']
    
    if not role or role not in valid_roles:
        return jsonify({"error": "Invalid role"}), 400

    db = get_db()
    result = db.users.update_one({"_id": ObjectId(id)}, {"$set": {"role": role}})
    
    if result.matched_count == 0:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"success": True, "message": "User role updated successfully", "role": role})

@auth_bp.route('/<id>', methods=['DELETE'])
@authenticate_token
@require_admin
def delete_user(id):
    db = get_db()
    user = db.users.find_one({"_id": ObjectId(id)})
    if not user:
        return jsonify({"error": "User not found"}), 404

    db.users.delete_one({"_id": ObjectId(id)})
    return jsonify({"success": True, "message": "User deleted successfully", "deletedUserId": id, "deletedUsername": user.get('username')})

@auth_bp.route('/<id>/reset-password', methods=['PATCH'])
@authenticate_token
@require_admin
def admin_reset_password(id):
    data = request.get_json()
    new_pass = data.get('newPassword', '')
    if len(new_pass) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    
    db = get_db()
    user = db.users.find_one({"_id": ObjectId(id)})
    if not user:
        return jsonify({"error": "User not found"}), 404

    hashed = bcrypt.hashpw(new_pass.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    db.users.update_one({"_id": ObjectId(id)}, {
        "$set": {"password": hashed},
        "$inc": {"sessionVersion": 1}
    })

    log_audit(db, "USER_PASSWORD_RESET_BY_ADMIN", g.user.get('userId'), g.user.get('username'), {
        "targetUserId": id,
        "targetUsername": user['username']
    })

    return jsonify({"success": True, "message": f"Password reset for '{user['username']}' successfully"})

@auth_bp.route('/change-password', methods=['PATCH'])
@authenticate_token
def change_password():
    data = request.get_json()
    username = data.get('username', '').lower()
    curr_pass = data.get('currentPassword', '')
    new_pass = data.get('newPassword', '')

    db = get_db()
    user = db.users.find_one({"username": username})
    if not user:
        return jsonify({"error": "User not found"}), 404

    if not bcrypt.checkpw(curr_pass.encode('utf-8'), str(user['password']).encode('utf-8')):
        return jsonify({"error": "Current password incorrect"}), 401

    hashed = bcrypt.hashpw(new_pass.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    db.users.update_one({"_id": user['_id']}, {
        "$set": {"password": hashed},
        "$inc": {"sessionVersion": 1}
    })

    log_audit(db, "USER_PASSWORD_CHANGED", str(user['_id']), user['username'])
    return jsonify({"success": True, "message": "Password changed successfully"})

@auth_bp.route('/<id>/photo', methods=['POST', 'GET', 'DELETE'])
@authenticate_token
def manage_photo(id):
    """Handle user photo upload, retrieval, and deletion"""
    from services.cloudinary_service import upload_user_photo, delete_cloudinary_asset, is_configured

    db = get_db()
    user = db.users.find_one({"_id": ObjectId(id)})

    if not user:
        return jsonify({"error": "User not found"}), 404

    # POST: Upload photo
    if request.method == 'POST':
        if 'photo' not in request.files:
            return jsonify({"error": "No photo file provided"}), 400

        file = request.files['photo']
        if not file or file.filename == '':
            return jsonify({"error": "No file selected"}), 400

        try:
            # Check if Cloudinary is configured
            if not is_configured():
                return jsonify({"error": "Cloudinary is not configured. Please set CLOUDINARY environment variables."}), 500

            # Delete old photo if exists
            if user.get('photoPublicId'):
                delete_cloudinary_asset(user['photoPublicId'])

            # Upload new photo
            result = upload_user_photo(file, id)

            # Update user document
            db.users.update_one(
                {"_id": ObjectId(id)},
                {
                    "$set": {
                        "photo": result['url'],
                        "photoPublicId": result['publicId'],
                        "photoStorage": "cloudinary"
                    }
                }
            )

            log_audit(db, "USER_PHOTO_UPLOADED", str(user['_id']), user['username'], {
                "photoUrl": result['url']
            })

            return jsonify({
                "success": True,
                "message": "Photo uploaded successfully",
                "photoUrl": result['url']
            })

        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            logger.error(f"Photo upload error: {e}")
            return jsonify({"error": f"Failed to upload photo: {str(e)}"}), 500

    # GET: Retrieve photo (for legacy non-cloudinary photos stored in DB)
    elif request.method == 'GET':
        if user.get('photoStorage') == 'cloudinary':
            return jsonify({"photoUrl": user.get('photo')})

        # For backward compatibility with base64 photos
        photo = user.get('photo')
        if not photo:
            return jsonify({"error": "No photo found"}), 404

        return jsonify({"photoUrl": photo})

    # DELETE: Remove photo
    elif request.method == 'DELETE':
        if user.get('photoPublicId'):
            delete_cloudinary_asset(user['photoPublicId'])

        db.users.update_one(
            {"_id": ObjectId(id)},
            {
                "$unset": {
                    "photo": "",
                    "photoPublicId": "",
                    "photoStorage": ""
                }
            }
        )

        log_audit(db, "USER_PHOTO_DELETED", str(user['_id']), user['username'])

        return jsonify({"success": True, "message": "Photo deleted successfully"})

# ==================== CUSTOMER AUTHENTICATION ====================

@auth_bp.route('/send-otp', methods=['POST'])
def send_otp():
    """Send OTP to customer email for login/registration"""
    from services.otp_service import generate_otp, store_otp, send_otp_email

    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    otp_type = data.get('type', 'login')  # 'login' or 'register'

    if not email or '@' not in email:
        return jsonify({"error": "Valid email address is required"}), 400

    try:
        db = get_db()

        logger.info(f"Generating OTP for email: {email}, type: {otp_type}")

        # For login: verify customer exists in database
        if otp_type == 'login':
            customer = db.customers.find_one({"email": email})
            if not customer:
                logger.warning(f"Login attempt with non-existent customer email: {email}")
                return jsonify({"error": "Email not found in customer database. Please register first."}), 404

        # For register: check if customer already exists
        if otp_type == 'register':
            customer = db.customers.find_one({"email": email})
            if customer:
                logger.warning(f"Registration attempt with existing email: {email}")
                return jsonify({"error": "Email already registered. Please login instead."}), 400

        # Generate OTP
        otp = generate_otp()
        logger.info(f"OTP generated: {otp}")

        # Store OTP in database
        if not store_otp(email, otp):
            logger.error(f"Failed to store OTP for {email}")
            return jsonify({"error": "Failed to generate OTP. Please try again."}), 500

        logger.info(f"OTP stored in database for {email}")

        # Send OTP via email
        send_result = send_otp_email(email, otp, otp_type)

        if not send_result:
            logger.warning(f"Failed to send OTP email to {email}")
            # For development: return the OTP if email fails (remove in production!)
            # In production, always require successful email send
            if current_app.config.get('DEBUG'):
                logger.info("DEBUG mode: returning OTP in response")
                return jsonify({
                    "success": True,
                    "message": "OTP generated (email not configured)",
                    "otp": otp  # Only for development!
                })
            return jsonify({"error": "Failed to send OTP email. Please check your email configuration in Render environment variables."}), 500

        logger.info(f"OTP email sent successfully to {email}")
        return jsonify({
            "success": True,
            "message": f"OTP sent to {email}. Valid for 10 minutes."
        })

    except Exception as e:
        logger.error(f"Error in send_otp: {e}", exc_info=True)
        return jsonify({"error": f"Failed to send OTP: {str(e)}"}), 500

@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp_endpoint():
    """Verify OTP and return token for customer login"""
    from services.otp_service import verify_otp

    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    otp = data.get('otp', '').strip()

    if not email or not otp:
        return jsonify({"error": "Email and OTP are required"}), 400

    if len(otp) != 6 or not otp.isdigit():
        return jsonify({"error": "OTP must be 6 digits"}), 400

    try:
        # Verify OTP
        result = verify_otp(email, otp)
        if not result.get('valid'):
            return jsonify({"error": result.get("error", "Invalid OTP")}), 401

        # OTP verified - check if customer exists
        db = get_db()
        customer = db.customers.find_one({"email": email})

        if not customer:
            return jsonify({
                "error": "Customer account not found",
                "otp_verified": True,
                "needs_registration": True
            }), 404

        # Generate JWT token for customer
        session_version = customer.get('sessionVersion', 1)
        token_payload = {
            "userId": str(customer['_id']),
            "email": customer.get('email'),
            "name": customer.get('name'),
            "role": 'customer',
            "sessionVersion": session_version,
            "exp": datetime.utcnow() + timedelta(days=7)
        }

        token = jwt.encode(token_payload, current_app.config['SECRET_KEY'], algorithm='HS256')

        # Log audit
        ip_addr = request.headers.get('X-Forwarded-For', request.remote_addr)
        log_audit(db, "CUSTOMER_LOGIN", str(customer['_id']), customer.get('name'), {"ip": ip_addr})

        return jsonify({
            "success": True,
            "token": token,
            "customer": {
                "id": str(customer['_id']),
                "email": customer.get('email'),
                "name": customer.get('name'),
                "phone": customer.get('phone'),
                "role": 'customer'
            }
        })

    except Exception as e:
        logger.error(f"Error in verify_otp: {e}")
        return jsonify({"error": "OTP verification failed"}), 500

@auth_bp.route('/register-customer', methods=['POST'])
def register_customer():
    """Register a new customer account with email and OTP"""
    from services.otp_service import send_otp_email, generate_otp, store_otp

    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    name = data.get('name', '').strip()
    phone = data.get('phone', '').strip()

    # Validation
    if not email or '@' not in email:
        return jsonify({"error": "Valid email is required"}), 400

    if not name or len(name) < 2:
        return jsonify({"error": "Name must be at least 2 characters"}), 400

    if not phone or len(phone) != 10 or not phone.isdigit():
        return jsonify({"error": "Valid 10-digit phone number is required"}), 400

    try:
        db = get_db()

        # Check if customer already exists
        existing = db.customers.find_one(
            {"$or": [{"email": email}, {"phone": phone}]}
        )
        if existing:
            field = "email" if existing.get('email') == email else "phone"
            return jsonify({"error": f"Customer with this {field} already exists"}), 400

        # Create new customer
        customer = {
            "email": email,
            "name": name,
            "phone": phone,
            "role": 'customer',
            "approved": True,
            "createdAt": datetime.utcnow(),
            "sessionVersion": 1
        }

        result = db.customers.insert_one(customer)
        customer_id = str(result.inserted_id)

        # Generate and send OTP
        otp = generate_otp()
        store_otp(email, otp)

        # Send OTP email
        if not send_otp_email(email, otp, 'register'):
            logger.warning(f"Failed to send registration OTP to {email}")
            if not current_app.config.get('DEBUG'):
                # In production, fail if email doesn't send
                db.customers.delete_one({"_id": result.inserted_id})
                return jsonify({"error": "Failed to send OTP. Please try again."}), 500

        log_audit(db, "CUSTOMER_REGISTERED", customer_id, name, {
            "email": email,
            "phone": phone
        })

        response = {
            "success": True,
            "message": "Registration successful! OTP sent to your email.",
            "customerId": customer_id,
            "email": email
        }

        # For development, include OTP
        if current_app.config.get('DEBUG'):
            response["otp"] = otp

        return jsonify(response), 201

    except Exception as e:
        logger.error(f"Error in register_customer: {e}")
        return jsonify({"error": "Registration failed"}), 500

@auth_bp.route('/login-customer-otp', methods=['POST'])
def login_customer_otp():
    """Finalize customer login after OTP verification (validates token and returns user)"""
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    token = data.get('token', '')

    if not email or not token:
        return jsonify({"error": "Email and token are required"}), 400

    try:
        # Decode and validate the JWT token
        token_payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])

        # Verify email matches
        if token_payload.get('email') != email:
            return jsonify({"error": "Token email mismatch"}), 401

        # Get customer from database
        db = get_db()
        customer = db.customers.find_one({"email": email})

        if not customer:
            return jsonify({"error": "Customer not found"}), 404

        return jsonify({
            "success": True,
            "token": token,
            "user": {
                "id": str(customer['_id']),
                "email": customer.get('email'),
                "name": customer.get('name'),
                "phone": customer.get('phone'),
                "role": 'customer'
            }
        })

    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Token has expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 401
    except Exception as e:
        logger.error(f"Error in login_customer_otp: {e}")
        return jsonify({"error": "Login finalization failed"}), 500
