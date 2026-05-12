import logging
from datetime import datetime
from bson import ObjectId
from flask import Blueprint, request, jsonify, g
from database import get_db
from utils.auth_middleware import authenticate_token, require_admin
from utils.tzutils import utc_now, to_iso_string

logger = logging.getLogger(__name__)
tickets_bp = Blueprint('tickets', __name__)

# ==================== HELPERS ====================

def generate_ticket_id():
    """Generate a unique ticket ID like TKT-1001"""
    db = get_db()
    # Find the highest ticket ID
    last_ticket = db.tickets.find_one(sort=[("ticketId", -1)])
    if not last_ticket:
        return "TKT-1001"
    
    try:
        last_id = last_ticket.get('ticketId', 'TKT-1000')
        num = int(last_id.split('-')[1])
        return f"TKT-{num + 1}"
    except Exception:
        return f"TKT-{secrets.token_hex(4).upper()}"

# ==================== CUSTOMER ROUTES ====================

@tickets_bp.route('/customer', methods=['GET'])
@authenticate_token
def get_customer_tickets():
    """Get all tickets for the logged-in customer"""
    try:
        db = get_db()
        user_id = g.user.get('userId') or g.user.get('id')
        if not user_id:
            return jsonify({"success": False, "error": "User ID not found in token"}), 401
            
        customer_id = ObjectId(user_id)
        
        # In this system, customers are users with role='customer'
        # We find tickets where customerId matches
        tickets = list(db.tickets.find({"customerId": customer_id}).sort("createdAt", -1))
        
        for t in tickets:
            t['_id'] = str(t['_id'])
            t['customerId'] = str(t['customerId'])
            t['createdAt'] = to_iso_string(t.get('createdAt'))
            t['updatedAt'] = to_iso_string(t.get('updatedAt'))
            
        return jsonify({"success": True, "tickets": tickets})
    except Exception as e:
        logger.error(f"Error fetching customer tickets: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@tickets_bp.route('/customer', methods=['POST'])
@authenticate_token
def create_customer_ticket():
    """Create a new support ticket"""
    try:
        data = request.get_json()
        db = get_db()
        
        user_id = g.user.get('userId') or g.user.get('id')
        if not user_id:
            return jsonify({"success": False, "error": "User ID not found in token"}), 401

        new_ticket = {
            "ticketId": generate_ticket_id(),
            "customerId": ObjectId(user_id),
            "customerName": g.user.get('name', 'Customer'),
            "subject": data.get('subject', 'No Subject'),
            "description": data.get('description', ''),
            "category": data.get('category', 'General'),
            "priority": data.get('priority', 'Medium'),
            "status": "open",
            "updates": [{
                "message": data.get('description', ''),
                "sender": "customer",
                "senderName": g.user.get('name', 'Customer'),
                "timestamp": utc_now()
            }],
            "createdAt": utc_now(),
            "updatedAt": utc_now()
        }
        
        result = db.tickets.insert_one(new_ticket)
        return jsonify({
            "success": True, 
            "message": "Ticket created successfully",
            "ticketId": new_ticket['ticketId'],
            "id": str(result.inserted_id)
        }), 201
    except Exception as e:
        logger.error(f"Error creating ticket: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@tickets_bp.route('/<ticket_id>/message', methods=['POST'])
@authenticate_token
def add_ticket_message(ticket_id):
    """Add a message to a ticket (both customer and admin)"""
    try:
        data = request.get_json()
        db = get_db()
        
        ticket = db.tickets.find_one({"_id": ObjectId(ticket_id)})
        if not ticket:
            return jsonify({"success": False, "error": "Ticket not found"}), 404
            
        user_id = g.user.get('userId') or g.user.get('id')
        # Role check: customer can only update their own tickets
        if g.user.get('role') == 'customer' and ticket['customerId'] != ObjectId(user_id):
            return jsonify({"success": False, "error": "Unauthorized"}), 403
            
        update = {
            "message": data.get('message'),
            "sender": g.user.get('role', 'user'),
            "senderName": g.user.get('name', 'User'),
            "timestamp": utc_now()
        }
        
        db.tickets.update_one(
            {"_id": ObjectId(ticket_id)},
            {
                "$push": {"updates": update},
                "$set": {"updatedAt": utc_now(), "status": "open" if g.user['role'] == 'customer' else ticket['status']}
            }
        )
        
        return jsonify({"success": True, "message": "Update added"})
    except Exception as e:
        logger.error(f"Error adding ticket message: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# ==================== ADMIN ROUTES ====================

@tickets_bp.route('/admin', methods=['GET'])
@authenticate_token
@require_admin
def get_all_tickets():
    """Admin: Get all tickets with filtering"""
    try:
        db = get_db()
        status = request.args.get('status')
        query = {}
        if status:
            query['status'] = status
            
        tickets = list(db.tickets.find(query).sort("updatedAt", -1))
        
        for t in tickets:
            t['_id'] = str(t['_id'])
            t['customerId'] = str(t['customerId'])
            t['createdAt'] = to_iso_string(t.get('createdAt'))
            t['updatedAt'] = to_iso_string(t.get('updatedAt'))
            
        return jsonify({"success": True, "tickets": tickets})
    except Exception as e:
        logger.error(f"Error fetching admin tickets: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@tickets_bp.route('/admin/<ticket_id>/status', methods=['PATCH'])
@authenticate_token
@require_admin
def update_ticket_status(ticket_id):
    """Admin: Update ticket status or assignment"""
    try:
        data = request.get_json()
        db = get_db()
        
        update_fields = {"updatedAt": utc_now()}
        if 'status' in data:
            update_fields['status'] = data['status']
        if 'priority' in data:
            update_fields['priority'] = data['priority']
            
        db.tickets.update_one({"_id": ObjectId(ticket_id)}, {"$set": update_fields})
        return jsonify({"success": True, "message": "Ticket updated"})
    except Exception as e:
        logger.error(f"Error updating ticket: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
