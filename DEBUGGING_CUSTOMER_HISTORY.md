# Customer Purchase History Fetch Debugging Guide

## Problem
Customer "SHAHINSHA" shows "Failed to fetch customer purchase history" error when opening history modal.

## Root Cause Analysis Flowchart

### Step 1: Check Browser Console (DevTools)
Open browser DevTools (F12 → Console tab) and look for `[useCustomers]` logs when trying to view history:

```
✅ WORKING: Should see logs like:
[useCustomers] 📤 Starting fetch for customer: <id>
[useCustomers] 🔗 URL: https://web-based-inventory.onrender.com/api/customers/<id>/purchases
[useCustomers] 🔐 Auth headers present: YES
[useCustomers] ⏱️  Response received in XXms (Status: 200)
[useCustomers] ✅ Successfully fetched purchases in XXms

❌ PROBLEM: If you see:
[useCustomers] 🔐 Auth headers present: NO (⚠️  MISSING TOKEN)
→ **FIX: Token is missing - need to re-login**

❌ PROBLEM: If you see Status: 401 or 403
→ **FIX: Token is invalid/expired - need to re-login**

❌ PROBLEM: If you see "TIMEOUT (10s exceeded)"
→ **FIX: Backend is slow or unreachable - check Render health**

❌ PROBLEM: If you see "NETWORK_ERROR" or "CORS"
→ **FIX: Network connectivity issue or CORS misconfiguration**
```

### Step 2: Verify Customer ID Format
In browser console, type:
```javascript
// Get all customers to see their format
const customers = localStorage.getItem('customers'); // if cached
// Or refresh customers list and inspect one

// Check if customer has 'id' property (not '_id')
// The ID should be a 24-character hex string like: 66a1b2c3d4e5f6g7h8i9j0k1
```

### Step 3: Test Authentication Token
In browser console:
```javascript
const token = localStorage.getItem('authToken');
console.log('Token exists:', !!token);
console.log('Token length:', token ? token.length : 0);
console.log('Token starts with "Bearer":', token && token.startsWith('Bearer'));
```

**Expected**: Token should be 200+ characters, NOT starting with "Bearer" (Bearer is added by api.js)

### Step 4: Manually Test API Endpoint
In browser console:
```javascript
// Get a customer ID first from the customers list
const customerId = 'YOUR_CUSTOMER_ID_HERE'; // Replace with actual ID from customer card

// Test the endpoint
const token = localStorage.getItem('authToken');
const response = await fetch(
  `https://web-based-inventory.onrender.com/api/customers/${customerId}/purchases`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

console.log('Status:', response.status);
const data = await response.json();
console.log('Response:', data);
```

**Expected responses**:
- ✅ Status 200: Returns { customerId, customerName, bills[], warranties[], stats }
- ❌ Status 400: Invalid customer ID format
- ❌ Status 401: Missing/invalid token
- ❌ Status 404: Customer not found in database
- ❌ Status 500: Server error (check backend logs)

### Step 5: Check Backend Logs
If you have SSH access to Render backend:
```bash
# View recent logs for customer purchase fetch
heroku logs --tail | grep "get_customer_purchases"

# Filter for SHAHINSHA customer
heroku logs --tail | grep "SHAHINSHA"
```

Look for patterns:
```
✅ GOOD:
[get_customer_purchases] ✅ Found customer: SHAHINSHA
[get_customer_purchases] ✅ Found X bills for customer SHAHINSHA
[get_customer_purchases] 📊 Returning response: X bills, X warranties

❌ BAD:
[get_customer_purchases] 🔓 Customer not found in database for ID: <id>
→ Means customer exists in frontend but not in MongoDB

[get_customer_purchases] ❌ Invalid ObjectId format: <id>
→ Means customer ID is malformed (not valid MongoDB ObjectId)

[get_customer_purchases] ❌ Unexpected error...
→ Check details after this message
```

## Common Fixes

### Fix 1: Re-login (Invalid or Expired Token)
```
1. Click LOGOUT button in app
2. Clear browser cache/cookies (Optional: Ctrl+Shift+Delete)
3. Return to app
4. Login again with credentials
5. Try viewing customer history again
```

### Fix 2: Force Refresh Customer List
```javascript
// In browser console
localStorage.removeItem('customers');
// Then click refresh button in app or reload page
```

### Fix 3: Check if Data Exists in Database
If you can access MongoDB Atlas:
```javascript
// In MongoDB Atlas console
db.customers.findOne({ name: /shahinsha/i })
// Should return customer document

db.bills.countDocuments({
  $or: [
    { "customerId": ObjectId("...") },  // Use customer ID from above
    { "customerName": /shahinsha/i }
  ]
})
// Should return count > 0 if bills exist
```

### Fix 4: Verify Backend Health
```bash
# Check basic health
curl https://web-based-inventory.onrender.com/health

# Check detailed diagnostics (newly added in latest deploy)
curl https://web-based-inventory.onrender.com/health/details
```

Expected output:
```json
{
  "api": "healthy",
  "database": {
    "status": "connected",
    "collections": {
      "customers": { "count": N, "status": "accessible" },
      "bills": { "count": N, "status": "accessible" }
    },
    "sample_customer": { ... }
  }
}
```

## Next Steps

1. **Start with Step 1**: Check browser console for `[useCustomers]` logs
2. **Identify the error pattern** from the logs
3. **Apply the corresponding fix** from Common Fixes section
4. **Test again** after applying fix
5. **If still broken**: Provide console logs + browser network tab screenshot for more detailed debugging

## Notes

- Latest commit (5945bcf) added comprehensive logging to all layers:
  - Backend: Detailed logs for each step of customer purchase fetch
  - Frontend: Time tracking, response headers, error categorization
  - New endpoint: `/health/details` for database diagnostics

- These logs make debugging much easier - they show exactly where the failure occurs

- Common timeouts: Render free tier can be slow (30-50s startup if sleeping)
