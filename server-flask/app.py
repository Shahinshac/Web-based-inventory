from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
import os
import certifi
from config import Config

# Initialize Flask App
app = Flask(__name__)
app.config.from_object(Config)

# Enable CORS (Allows the React frontend to communicate with Flask)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Centralized MongoDB Connection
try:
    print(f"Connecting to MongoDB: {app.config['MONGO_URI'].split('@')[-1] if '@' in app.config['MONGO_URI'] else 'Local Database'}")
    # Fix for SSL certificate verifications on Windows networks
    client = MongoClient(app.config['MONGO_URI'], tlsCAFile=certifi.where())
    db = client[app.config['DB_NAME']]
    # Ping to check connection
    client.admin.command('ping')
    print("✅ Successfully connected to MongoDB Database!")
except Exception as e:
    print(f"❌ Failed to connect to MongoDB: {e}")
    db = None

# Base Route
@app.route('/', methods=['GET'])
def index():
    return jsonify({
        "status": "online",
        "message": "Welcome to the 26:07 Electronics Python Flask API",
        "version": "1.0.0"
    })

# Health Check Route
@app.route('/health', methods=['GET'])
def health_check():
    db_status = "connected" if db is not None else "disconnected"
    return jsonify({"db": db_status, "api": "healthy"}), 200

# Placeholder User Endpoint (To demonstrate integration)
@app.route('/api/users/me', methods=['GET'])
def get_current_user():
    # Will be protected by JWT middleware soon
    return jsonify({"user": {"username": "Admin (Flask Port)"}, "role": "admin"})

if __name__ == '__main__':
    print(f"🚀 Starting Flask Server on port {app.config['PORT']}...")
    app.run(host='0.0.0.0', port=app.config['PORT'], debug=app.config['DEBUG'])
