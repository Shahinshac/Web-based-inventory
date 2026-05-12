import os
from dotenv import load_dotenv
load_dotenv()

from database import get_db, connect_db
import logging

# Set up logging to see what's happening
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MockApp:
    def __init__(self, mongo_uri, db_name):
        self.config = {
            'MONGO_URI': mongo_uri,
            'DB_NAME': db_name
        }

def check_emi_data():
    # Use environment variable for MongoDB URI if available
    mongo_uri = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI")
    db_name = os.getenv("DB_NAME", "inventory")
    
    if not mongo_uri:
        print("MONGO_URI not found in environment")
        return

    app = MockApp(mongo_uri, db_name)
    connect_db(app)
    
    db = get_db()
    total_bills = db.bills.count_documents({})
    emi_bills = db.bills.count_documents({"paymentMode": {"$regex": "emi", "$options": "i"}})
    emi_plans = db.emi_plans.count_documents({})
    
    print(f"Total Bills: {total_bills}")
    print(f"EMI Bills (regex 'emi'): {emi_bills}")
    print(f"EMI Plans: {emi_plans}")
    
    # Check if emi_plans has billId field correctly
    if emi_plans > 0:
        sample_plan = db.emi_plans.find_one()
        print(f"Sample Plan billNumber: {sample_plan.get('billNumber')}")
        print(f"Sample Plan customerName: {sample_plan.get('customerName')}")
    
    # Check if bills has emiDetails
    if emi_bills > 0:
        sample_bill = db.bills.find_one({"paymentMode": {"$regex": "emi", "$options": "i"}})
        print(f"Sample Bill billNumber: {sample_bill.get('billNumber')}")
        print(f"Sample Bill paymentMode: {sample_bill.get('paymentMode')}")
        print(f"Sample Bill emiDetails: {sample_bill.get('emiDetails')}")
    else:
        # Check a few random bills to see paymentMode
        print("\nChecking random bills:")
        for b in db.bills.find().limit(5):
            print(f"Bill {b.get('billNumber')}: paymentMode='{b.get('paymentMode')}'")

if __name__ == "__main__":
    check_emi_data()
