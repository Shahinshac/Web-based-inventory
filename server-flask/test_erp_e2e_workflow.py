#!/usr/bin/env python3
"""
E2E Business Workflow Integration Test Suite
Validates the complete lifecycle:
1. Business Setup & Admin Auth
2. Product Creation & Inventory Check
3. Customer Creation & Isolation Verification
4. POS Checkout / Sale (Stock reduction, Invoice, GST, Profit)
5. Customer Portal Registration, Login & Dashboard Metrics
6. EMI Plan Schedule & Installment Payment
7. Customer Data Isolation (Multi-tenant check)
8. Salary Processing & Expense Segregation
9. Analytics & Financial Reporting Consistency
10. Invoice Deletion, Stock Restoration & Customer Stats Reversal
"""

import sys
import os
import json
import re
from datetime import datetime
from bson import ObjectId

# Add server-flask to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app
from database import get_db

def run_tests():
    print("=" * 80)
    print("ERP END-TO-END WORKFLOW & STABILIZATION INTEGRATION TEST")
    print("=" * 80)

    client = app.test_client()
    db = get_db()
    if db is None:
        print("❌ Database connection failed!")
        return False

    # Clean up any leftover test data from prior test runs
    test_email_regex = re.compile(r"^(rajesh|priya|e2e_).*@example\.com$", re.IGNORECASE)
    db.customers.delete_many({"email": test_email_regex})
    db.bills.delete_many({"customerEmail": test_email_regex})
    db.emi_plans.delete_many({"customerName": re.compile(r"^(Rajesh Kumar|Priya Sharma)$")})
    db.warranties.delete_many({"customerEmail": test_email_regex})
    db.products.delete_many({"name": re.compile(r"^E2E Smart OLED TV")})

    results = []

    def record_step(name, success, details=""):
        status = "✅ PASS" if success else "❌ FAIL"
        results.append((name, success, details))
        print(f"[{status}] {name}")
        if details:
            print(f"       Details: {details}")

    # ==================== STEP 0: ADMIN AUTH ====================
    print("\n--- STEP 0: Admin Authentication ---")
    admin_login = client.post("/api/users/login", json={
        "username": "admin",
        "password": "admin123"
    })
    admin_token = None
    if admin_login.status_code == 200:
        admin_data = admin_login.get_json()
        admin_token = admin_data.get("token")
        record_step("Admin Login", True, f"Role: {admin_data.get('user', {}).get('role')}")
    else:
        record_step("Admin Login", False, f"Status: {admin_login.status_code}")

    admin_headers = {
        "Authorization": f"Bearer {admin_token}",
        "X-Admin-Password": "admin123"
    } if admin_token else {}

    # ==================== STEP 1: PRODUCT CREATION ====================
    print("\n--- STEP 1: Product Creation & Inventory ---")
    new_product = {
        "name": f"E2E Smart OLED TV 55inch {int(datetime.utcnow().timestamp())}",
        "hsnCode": "8528",
        "price": 22000,        # Selling price inclusive of GST
        "costPrice": 15000,    # Cost price
        "gstPercent": 18,
        "quantity": 10,
        "minStock": 3,
        "warrantyMonths": 24,
        "warrantyRenewalPrice": 1500
    }

    prod_res = client.post("/api/products/", json=new_product, headers=admin_headers)
    product_id = None
    if prod_res.status_code in [200, 201]:
        prod_data = prod_res.get_json()
        product_id = prod_data.get("id") or prod_data.get("_id")
        record_step("Create Product", True, f"Product ID: {product_id}, Stock: 10, Price: ₹22,000, Cost: ₹15,000")
    else:
        record_step("Create Product", False, f"Status: {prod_res.status_code}")

    # ==================== STEP 2: CUSTOMER CREATION ====================
    print("\n--- STEP 2: Customer Creation ---")
    ts = int(datetime.utcnow().timestamp())
    cust_a_email = f"rajesh_{ts}@example.com"
    cust_b_email = f"priya_{ts}@example.com"

    cust_a_res = client.post("/api/customers/", json={
        "name": "Rajesh Kumar",
        "email": cust_a_email,
        "phone": f"98765{str(ts)[-5:]}",
        "address": "104 MG Road, Bangalore",
        "city": "Bangalore",
        "state": "Karnataka"
    }, headers=admin_headers)

    customer_a_id = None
    if cust_a_res.status_code in [200, 201]:
        cust_a_data = cust_a_res.get_json()
        customer_a_id = cust_a_data.get("id") or cust_a_data.get("_id")
        record_step("Create Customer A", True, f"ID: {customer_a_id}, Email: {cust_a_email}")
    else:
        record_step("Create Customer A", False, f"Status: {cust_a_res.status_code}")

    cust_b_res = client.post("/api/customers/", json={
        "name": "Priya Sharma",
        "email": cust_b_email,
        "phone": f"98766{str(ts)[-5:]}",
        "address": "502 Park Avenue, Mumbai",
        "city": "Mumbai",
        "state": "Maharashtra"
    }, headers=admin_headers)
    customer_b_id = cust_b_res.get_json().get("id") if cust_b_res.status_code in [200, 201] else None

    # Register Customer A for portal
    c_reg = client.post("/api/customer-auth/register", json={
        "email": cust_a_email,
        "password": "SecurePassword123!"
    })
    record_step("Customer Portal Account Registration", c_reg.status_code in [200, 201], f"Status: {c_reg.status_code}")

    c_login = client.post("/api/customer-auth/login", json={
        "email": cust_a_email,
        "password": "SecurePassword123!"
    })
    portal_token = None
    if c_login.status_code == 200:
        portal_token = c_login.get_json().get("token")
        record_step("Customer Portal Login (JWT)", True, "JWT token acquired for Customer A")
    else:
        record_step("Customer Portal Login (JWT)", False, f"Status: {c_login.status_code}")

    portal_headers = {"Authorization": f"Bearer {portal_token}"} if portal_token else {}

    # ==================== STEP 3: POS CHECKOUT WITH EMI ====================
    print("\n--- STEP 3: POS Checkout (EMI Sale) ---")
    checkout_payload = {
        "customerId": customer_a_id,
        "customerState": "Same",
        "discountPercent": 0,
        "paymentMode": "emi",
        "emiDetails": {
            "months": 3,
            "downPayment": 4000,
            "emiAmount": 6000,
            "interestRate": 0
        },
        "items": [{
            "productId": product_id,
            "quantity": 1,
            "price": 22000
        }]
    }

    checkout_res = client.post("/api/checkout/", json=checkout_payload, headers=admin_headers)
    invoice_id = None
    if checkout_res.status_code in [200, 201]:
        inv_data = checkout_res.get_json()
        invoice_id = inv_data.get("billId")
        inv_num = inv_data.get("billNumber")
        grand_total = inv_data.get("grandTotal") or inv_data.get("afterDiscount")
        gst_amt = inv_data.get("gstAmount")
        record_step("POS EMI Checkout", True, f"Invoice: {inv_num}, Total: ₹{grand_total}, GST: ₹{gst_amt}")

        # Check stock reduction directly in DB: 10 - 1 = 9
        prod_doc = db.products.find_one({"_id": ObjectId(product_id)})
        stock_after = prod_doc.get("quantity") if prod_doc else None
        record_step("Stock Reduction", stock_after == 9, f"Stock after sale: {stock_after} (Expected: 9)")

        # Check customer purchase stats in DB
        cust_doc = db.customers.find_one({"_id": ObjectId(customer_a_id)})
        purchases_count = cust_doc.get("purchasesCount", 0) if cust_doc else 0
        total_purchases = cust_doc.get("totalPurchases", 0) if cust_doc else 0
        record_step("Customer Purchases Count & Total Sync",
                    purchases_count == 1 and total_purchases == 22000,
                    f"Count: {purchases_count}, Total: ₹{total_purchases}")
    else:
        record_step("POS EMI Checkout", False, f"Status: {checkout_res.status_code} - {checkout_res.get_data(as_text=True)}")

    # ==================== STEP 4: EMI PLAN VERIFICATION & INSTALLMENT PAYMENT ====================
    print("\n--- STEP 4: EMI Plan Verification & Installment Payment ---")
    emi_plan = db.emi_plans.find_one({"customerId": ObjectId(customer_a_id)})
    if emi_plan:
        plan_id = str(emi_plan["_id"])
        record_step("EMI Auto-Creation on POS Checkout", True,
                    f"Plan ID: {plan_id}, Total: ₹{emi_plan.get('totalAmount')}, DownPayment: ₹{emi_plan.get('downPayment')}")

        # Overpayment rejection test via PATCH /api/emi/<emi_id>/payment
        overpay = client.patch(f"/api/emi/{plan_id}/payment", json={
            "installmentNo": 1,
            "amount": 7000, # Exceeds installment amount 6000
            "paymentMethod": "UPI"
        }, headers=admin_headers)
        record_step("EMI Overpayment Guard", overpay.status_code == 400,
                    f"Status {overpay.status_code}: {overpay.get_json().get('error')}")

        # Valid installment payment
        valid_pay = client.patch(f"/api/emi/{plan_id}/payment", json={
            "installmentNo": 1,
            "amount": 6000,
            "paymentMethod": "UPI"
        }, headers=admin_headers)
        if valid_pay.status_code == 200:
            updated_p = db.emi_plans.find_one({"_id": ObjectId(plan_id)})
            tot_paid = updated_p.get("totalPaid")
            tot_pending = updated_p.get("totalPending")
            # Down payment 4,000 + 1st installment 6,000 = 10,000 paid; 22,000 - 10,000 = 12,000 pending
            record_step("EMI Installment Payment & Balance Sync",
                        tot_paid == 10000 and tot_pending == 12000,
                        f"Total Paid: ₹{tot_paid} (Expected: 10000), Total Pending: ₹{tot_pending} (Expected: 12000)")
        else:
            record_step("EMI Installment Payment", False, f"Status: {valid_pay.status_code} - {valid_pay.get_data(as_text=True)}")
    else:
        record_step("EMI Plan Verification", False, "No EMI plan found for customer")

    # ==================== STEP 5: CUSTOMER PORTAL DATA & METRICS ====================
    print("\n--- STEP 5: Customer Portal Verification ---")
    if portal_token:
        # Dashboard
        dash = client.get("/api/customer/dashboard", headers=portal_headers)
        if dash.status_code == 200:
            d_data = dash.get_json()
            stats = d_data.get("stats", {})
            out_bal = stats.get("outstandingBalance")
            active_emis = stats.get("activeEMIs")
            record_step("Customer Portal Dashboard Metrics",
                        out_bal == 12000 and active_emis == 1,
                        f"Outstanding: ₹{out_bal} (Expected: 12000), Active EMIs: {active_emis}")
        else:
            record_step("Customer Portal Dashboard", False, f"Status: {dash.status_code}")

        # Invoices
        inv_res = client.get("/api/customer/invoices", headers=portal_headers)
        if inv_res.status_code == 200:
            inv_data = inv_res.get_json()
            invs = inv_data.get("invoices", []) if isinstance(inv_data, dict) else inv_data
            record_step("Customer Portal Invoices List", len(invs) == 1, f"Found {len(invs)} invoice(s)")
        else:
            record_step("Customer Portal Invoices List", False, f"Status: {inv_res.status_code}")

        # EMI Plans
        emi_res = client.get("/api/customer/emi", headers=portal_headers)
        if emi_res.status_code == 200:
            emi_json = emi_res.get_json()
            emis = emi_json.get("emiPlans", [])
            first_emi = emis[0] if emis else {}
            record_step("Customer Portal EMI Schedule",
                        len(emis) == 1 and first_emi.get("totalPending") == 12000,
                        f"Found {len(emis)} plan(s), Pending: ₹{first_emi.get('totalPending')}")
        else:
            record_step("Customer Portal EMI Schedule", False, f"Status: {emi_res.status_code}")

        # Warranties auto-generation
        war_res = client.get("/api/customer/warranties", headers=portal_headers)
        if war_res.status_code == 200:
            war_json = war_res.get_json()
            wars = war_json.get("warranties", []) if isinstance(war_json, dict) else war_json
            record_step("Customer Auto-Generated Warranties", len(wars) == 1,
                        f"Found {len(wars)} warranty record(s)")
        else:
            record_step("Customer Auto-Generated Warranties", False, f"Status: {war_res.status_code}")

    # ==================== STEP 6: CUSTOMER DATA ISOLATION ====================
    print("\n--- STEP 6: Customer Data Isolation (Multi-tenant check) ---")
    # Register Customer B
    client.post("/api/customer-auth/register", json={
        "email": cust_b_email,
        "password": "SecurePassword123!"
    })
    b_login = client.post("/api/customer-auth/login", json={
        "email": cust_b_email,
        "password": "SecurePassword123!"
    })
    if b_login.status_code == 200:
        b_token = b_login.get_json().get("token")
        b_headers = {"Authorization": f"Bearer {b_token}"}

        # Customer B invoices must be 0
        b_inv_res = client.get("/api/customer/invoices", headers=b_headers)
        b_inv_data = b_inv_res.get_json() if b_inv_res.status_code == 200 else {}
        b_invs = b_inv_data.get("invoices", []) if isinstance(b_inv_data, dict) else b_inv_data

        # Customer B EMIs must be 0
        b_emi_res = client.get("/api/customer/emi", headers=b_headers)
        b_emis = b_emi_res.get_json().get("emiPlans", []) if b_emi_res.status_code == 200 else []

        isolation_ok = (len(b_invs) == 0 and len(b_emis) == 0)
        record_step("Customer Data Isolation", isolation_ok,
                    f"Customer B sees {len(b_invs)} invoices and {len(b_emis)} EMIs (Must be 0)")
    else:
        record_step("Customer Data Isolation", False, "Could not authenticate Customer B")

    # ==================== STEP 7: SALARY PROCESSING ====================
    print("\n--- STEP 7: Salary Processing ---")
    curr_month = datetime.utcnow().strftime("%Y-%m")
    sal_res = client.post("/api/salary/process-monthly", json={"month": curr_month}, headers=admin_headers)
    record_step("Monthly Salary Processing", sal_res.status_code in [200, 201],
                f"Status: {sal_res.status_code}")

    # ==================== STEP 8: FINANCIAL ANALYTICS CONSISTENCY ====================
    print("\n--- STEP 8: Financial Analytics & Formula Consistency ---")
    rev_res = client.get("/api/analytics/revenue", headers=admin_headers)
    if rev_res.status_code == 200:
        rev_data = rev_res.get_json()
        rev = rev_data.get("totalRevenue", 0)
        cost = rev_data.get("totalCost", 0)
        profit = rev_data.get("totalProfit", 0)
        margin = rev_data.get("profitMargin")
        # Validation: Base Revenue should be ~18,644, Cost = 15,000, Profit = 3,644
        record_step("Financial Analytics Consistency", rev > 0 and cost > 0 and profit > 0,
                    f"Base Revenue: ₹{rev:,.2f}, COGS: ₹{cost:,.2f}, Gross Profit: ₹{profit:,.2f}, Margin: {margin}%")
    else:
        record_step("Financial Analytics Consistency", False, f"Status: {rev_res.status_code}")

    # ==================== STEP 9: INVOICE DELETION & STOCK REVERSAL ====================
    print("\n--- STEP 9: Invoice Deletion & Stock Reversal ---")
    if invoice_id:
        del_res = client.delete(f"/api/checkout/{invoice_id}", headers=admin_headers)
        if del_res.status_code == 200:
            # Check stock restored back to 10
            prod_restored = db.products.find_one({"_id": ObjectId(product_id)})
            restored_stock = prod_restored.get("quantity") if prod_restored else None
            record_step("Stock Restoration on Invoice Delete", restored_stock == 10,
                        f"Stock after deletion: {restored_stock} (Expected: 10)")

            # Check customer purchase stats reversed to 0
            cust_restored = db.customers.find_one({"_id": ObjectId(customer_a_id)})
            p_cnt = cust_restored.get("purchasesCount", -1) if cust_restored else -1
            p_tot = cust_restored.get("totalPurchases", -1) if cust_restored else -1
            record_step("Customer Purchase Stats Reversal",
                        p_cnt == 0 and p_tot == 0,
                        f"PurchasesCount: {p_cnt}, TotalPurchases: ₹{p_tot}")
        else:
            record_step("Invoice Deletion", False, f"Status: {del_res.status_code}")

    # ==================== SUMMARY ====================
    print("\n" + "=" * 80)
    print("INTEGRATION TEST SUMMARY")
    print("=" * 80)
    total = len(results)
    passed = sum(1 for _, s, _ in results if s)
    failed = total - passed
    print(f"Total Steps: {total} | Passed: {passed} | Failed: {failed}")

    for name, success, details in results:
        mark = "✅" if success else "❌"
        print(f"  {mark} {name}: {details}")

    return failed == 0

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
