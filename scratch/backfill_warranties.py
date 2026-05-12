
import os
import sys
from bson import ObjectId
from datetime import datetime

# Add server-flask to path
sys.path.append(os.path.join(os.getcwd(), 'server-flask'))

from database import connect_db
from flask import Flask

app = Flask(__name__)
# Dummy config
app.config['MONGO_URI'] = os.environ.get('MONGODB_URI') or "mongodb://localhost:27017/inventory"
app.config['DB_NAME'] = os.environ.get('DB_NAME', 'inventorydb')

db = connect_db(app)

def backfill_warranties():
    print("Starting warranty backfill...")
    warranties = list(db.warranties.find({"customerEmail": {"$exists": False}}))
    print(f"Found {len(warranties)} warranties to backfill.")
    
    updated_count = 0
    for w in warranties:
        customer_id = w.get('customerId')
        if not customer_id:
            continue
            
        # Find customer
        customer = db.customers.find_one({"_id": ObjectId(customer_id) if isinstance(customer_id, str) else customer_id})
        if customer:
            update_data = {
                "customerName": customer.get('name'),
                "customerEmail": customer.get('email'),
                "customerPhone": customer.get('phone')
            }
            db.warranties.update_one({"_id": w['_id']}, {"$set": update_data})
            updated_count += 1
            if updated_count % 10 == 0:
                print(f"Updated {updated_count} records...")
        else:
            # Maybe find by invoice?
            invoice_no = w.get('invoiceNo')
            if invoice_no:
                bill = db.bills.find_one({"billNumber": invoice_no})
                if bill:
                    update_data = {
                        "customerName": bill.get('customerName'),
                        "customerEmail": bill.get('customerEmail'),
                        "customerPhone": bill.get('customerPhone')
                    }
                    db.warranties.update_one({"_id": w['_id']}, {"$set": update_data})
                    updated_count += 1

    print(f"Backfill complete. Updated {updated_count} records.")

if __name__ == "__main__":
    backfill_warranties()
