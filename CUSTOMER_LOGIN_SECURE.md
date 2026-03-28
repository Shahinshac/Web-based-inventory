# Secure Customer Login - Email + OTP Authentication

## 🔐 Why Email + OTP? (Safest Method)

### Problems with Phone + Password ❌
- Phone numbers are semi-public (easy to find)
- Passwords can be compromised/forgotten
- Vulnerable to brute force attacks
- Single point of failure

### Advantages of Email + OTP ✅
- **Email is private** - Not publicly shared like phone
- **Passwordless** - No passwords to steal or compromise
- **One-time codes** - Cannot be replayed or reused
- **Time-limited** - Expires after 5 minutes automatically
- **Industry standard** - Used by Google, Amazon, Microsoft, Apple
- **Secure** - 6-digit OTP has 1 million combinations
- **User-friendly** - No password complexity rules to remember

---

## 🔑 Customer Login Flow

### Step 1: Enter Email
```
User enters their email address
System validates email format
```

### Step 2: Send OTP
```
Backend generates 6-digit OTP
OTP sent to customer's email
5-minute expiry timer starts
```

### Step 3: Enter OTP
```
Customer checks email
Enters 6-digit code
System verifies OTP
```

### Step 4: Auto-Login
```
OTP verified successfully
Backend creates session token
Customer logged into portal
```

---

## 📋 Frontend Implementation (DONE ✅)

### Customer Login Screen
```
Mode Selector:
├── Staff Login (username + password)
└── Customer Login (email + OTP) ← SECURE METHOD

Customer Mode Options:
├── 1. Case: New Customer
│   ├── Toggle "Create one here"
│   ├── Enter: Full Name, Email, Phone (10-digit)
│   ├── Click "Create Account"
│   └── Redirects to login screen
│
├── 2. Case: Existing Customer (First Time)
│   ├── Enter email
│   ├── Click "Send OTP to Email"
│   ├── Receive OTP in email (60 seconds)
│   ├── Enter 6-digit code
│   ├── Click "Verify OTP & Login"
│   └── Logged into portal ✅
│
└── 3. Case: Returning Customer
    ├── Enter email
    ├── Click "Send OTP to Email"
    ├── Enter OTP from email
    ├── Click "Verify OTP & Login"
    └── Logged into portal ✅
```

### Features
- ✅ Email + OTP step-by-step flow
- ✅ OTP timer (shows countdown: 4:52, 4:51...)
- ✅ Resend OTP button (appears when expired)
- ✅ Auto-focus on OTP input
- ✅ Numeric-only input (auto-filters non-digits)
- ✅ Security badge showing "No password stored"
- ✅ Email confirmation message
- ✅ Back button to change email

---

## ⚙️ Backend API Endpoints Required

### 1. Send OTP to Email
```javascript
POST /api/users/send-otp
Headers: Content-Type: application/json

Request:
{
  "email": "customer@example.com",
  "type": "login"  // or "registration"
}

Response:
{
  "success": true,
  "message": "OTP sent to email"
}

Errors:
- 400: Invalid email format
- 404: Email not registered (for login)
- 429: Too many requests (rate limit)
```

### 2. Verify OTP
```javascript
POST /api/users/verify-otp
Headers: Content-Type: application/json

Request:
{
  "email": "customer@example.com",
  "otp": "123456"
}

Response:
{
  "success": true,
  "token": "jwt_token_for_login",
  "expiresIn": 3600  // seconds
}

Errors:
- 400: Invalid OTP
- 410: OTP expired (>5 minutes)
- 429: Too many attempts (rate limit after 3 fails)
```

### 3. Register Customer
```javascript
POST /api/users/register-customer
Headers: Content-Type: application/json

Request:
{
  "email": "newcustomer@example.com",
  "name": "John Doe",
  "phone": "9876543210",
  "role": "customer"
}

Response:
{
  "success": true,
  "message": "Registration successful",
  "redirectTo": "login"
}

Errors:
- 400: Email already exists
- 400: Invalid phone (must be 10 digits)
```

### 4. Login Customer After OTP Verification
```javascript
POST /api/users/login-customer-otp
Headers: Content-Type: application/json

Request:
{
  "email": "customer@example.com",
  "token": "otp_verification_token"
}

Response:
{
  "success": true,
  "user": {
    "_id": "user_id",
    "email": "customer@example.com",
    "name": "John Doe",
    "phone": "9876543210",
    "role": "customer",
    "createdAt": "2024-03-27T10:30:00Z"
  },
  "token": "jwt_auth_token",
  "expiresIn": 86400  // 24 hours
}

Errors:
- 400: Invalid token
- 404: User not found
```

---

## 🗄️ Database Updates Required

### Customers Collection
```javascript
{
  _id: ObjectId,
  email: String,              // ← PRIMARY LOGIN IDENTIFIER
  name: String,
  phone: String,
  address: String,
  city: String,
  pincode: String,
  purchasesCount: Number,
  totalPurchases: Number,
  role: "customer",
  isActive: Boolean,
  createdAt: DateTime,
  lastLogin: DateTime
}

// Index for fast email lookup
db.customers.createIndex({ email: 1 }, { unique: true })
```

### OTP Storage (Temporary)
```javascript
// NEW COLLECTION: customer_otps (auto-delete after 5 min)
{
  _id: ObjectId,
  email: String,
  otp: String,              // Hash this! Not plain text
  otpHash: String,          // bcrypt hash for security
  attempts: Number,         // Track failed attempts
  maxAttempts: 3,
  createdAt: DateTime,
  expiresAt: DateTime       // 5 minutes from creation
}

// TTL index to auto-delete expired OTPs
db.customer_otps.createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
)
```

---

## 🔒 Security Best Practices

### OTP Generation
```javascript
// Generate 6-digit numeric OTP
const otp = Math.floor(100000 + Math.random() * 900000).toString();

// Store HASHED OTP, never plain text
const otpHash = await bcrypt.hash(otp, 10);

// Email plain OTP to user, store hash in database
// Only hash is stored on server
```

### Rate Limiting
```javascript
// Prevent brute force attacks
- Max 3 OTP verification attempts
- Max 5 OTP send requests per hour per email
- Increasing delays between attempts
```

### Email Security
```javascript
// Send OTP via email
Subject: "Your 26:07 Electronics Login Code"
Body:
  "Your login code is: 123456
   This code expires in 5 minutes.
   Never share this code with anyone.
   If you didn't request this, ignore this email."
```

### Token Security
```javascript
// After OTP verification
1. Create temporary token (5 minutes)
2. Use token to exchange for JWT (24 hours)
3. Never send OTP verification directly as login token
4. Clear temporary token after login
```

---

## 📱 Test Credentials (After Backend Setup)

### Register New Customer
```
Name:  John Customer
Email: john@example.com
Phone: 9876543210

→ Will receive email from system
→ Use OTP from email to login
```

### Test OTP Scenarios
```
Scenario 1: Valid OTP
- Request: send-otp → email: john@example.com
- Receive OTP: 123456 (in email)
- Request: verify-otp → email, otp: 123456
- Result: ✅ Login successful

Scenario 2: Expired OTP
- Wait >5 minutes after OTP sent
- Try to verify
- Result: ❌ OTP expired error
- Solution: Click "Resend OTP"

Scenario 3: Invalid OTP
- Enter wrong code: 654321
- Result: ❌ Invalid OTP error (attempt 1/3)
- After 3 attempts: Locked out for 5 minutes

Scenario 4: Wrong Email
- Enter: wrong@example.com
- Result: ❌ Account not found
- Solution: Use registration to create account
```

---

## 📧 Email Template

**Subject:** Your 26:07 Electronics Login Code

```
Dear {name},

Your login code is: {OTP}

This code expires in 5 minutes.

Enter this code in the customer login form to access your account.

🔒 Security Reminder:
- Never share this code with anyone
- 26:07 Electronics will never ask for your code
- If you didn't request this, ignore this email

Need help?
Contact: support@2607electronics.com
Phone: 7594012761

---
Best regards,
26:07 Electronics Team
```

---

## ✅ Implementation Checklist

- [ ] Create customer_otps collection with TTL index
- [ ] Implement /api/users/send-otp endpoint
- [ ] Implement /api/users/verify-otp endpoint
- [ ] Implement /api/users/register-customer endpoint
- [ ] Implement /api/users/login-customer-otp endpoint
- [ ] Setup email service (SendGrid, Mailtrap, AWS SES, etc)
- [ ] Add rate limiting middleware
- [ ] Add OTP hashing (bcrypt)
- [ ] Test all OTP scenarios
- [ ] Add error handling for edge cases
- [ ] Deploy to Vercel/production
- [ ] Monitor OTP failures in logs

---

## 🚀 Deployment Ready

Your frontend is **100% ready** at:
```
https://web-based-inventory-shahinshac.vercel.app
```

Customer can see:
✅ Email + OTP login form
✅ Registration with email
✅ OTP timer and resend button
✅ Security badge showing "No password stored"

Just waiting for backend OTP endpoints! 🔑
