from functools import wraps
from flask import request, jsonify, current_app, g
import jwt

def authenticate_token(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'No auth token provided'}), 401
            
        token = auth_header.split(' ')[1]
        
        try:
            # Decode the JWT payload. The Node.js app uses JWT_SECRET
            secret = current_app.config.get('SECRET_KEY')
            decoded = jwt.decode(token, secret, algorithms=['HS256'])
            
            # Attach user details to Flask global context 'g'
            g.user = decoded
            
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 403
            
        return f(*args, **kwargs)
    return decorated


def require_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # We assume authenticate_token was called BEFORE require_admin.
        if not hasattr(g, 'user') or g.user.get('role') != 'admin':
            return jsonify({'error': 'Admin privileges required'}), 403

        return f(*args, **kwargs)
    return decorated


def require_admin_password(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # 1. Check if user is admin
        if not hasattr(g, 'user') or g.user.get('role') != 'admin':
            return jsonify({'error': 'Admin privileges required for this action'}), 403

        # 2. Check for admin password in headers
        admin_password = request.headers.get('X-Admin-Password')
        if not admin_password:
            # Fallback to body if not in headers
            try:
                data = request.get_json(silent=True) or {}
                admin_password = data.get('adminPassword')
            except:
                pass

        if not admin_password:
            return jsonify({'error': 'Admin password required', 'passwordRequired': True}), 401

        # 3. Verify password against database
        from database import get_db
        import bcrypt
        db = get_db()
        user = db.users.find_one({"username": g.user.get('username')})
        
        if not user or not bcrypt.checkpw(admin_password.encode('utf-8'), user['password'].encode('utf-8')):
            return jsonify({'error': 'Invalid admin password'}), 401

        return f(*args, **kwargs)
    return decorated


def require_customer(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # We assume authenticate_token was called BEFORE require_customer.
        if not hasattr(g, 'user') or g.user.get('role') != 'customer':
            return jsonify({'error': 'Customer authentication required'}), 403

        return f(*args, **kwargs)
    return decorated
