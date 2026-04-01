# Customer Portal - Complete Rebuild Documentation

## Overview
The customer portal has been completely rebuilt from the ground up with enhanced accuracy, security, and user experience. This document outlines the architecture, features, and usage.

## Architecture

### Backend (Flask)
- **Location**: `server-flask/routes/`
- **Authentication**: `customer_auth.py` - Email + Password authentication
- **Portal Routes**: `customer_portal.py` - All customer-specific endpoints
- **Middleware**: JWT-based authentication with role validation
- **Database**: MongoDB with proper indexing

### Frontend (React)
- **Location**: `web-app/client/src/components/CustomerPortal/`
- **Components**:
  - `CustomerPortal.jsx` - Main container with navigation
  - `CustomerDashboard.jsx` - Statistics and overview
  - `CustomerInvoices.jsx` - Invoice list with PDF download
  - `CustomerWarranties.jsx` - Warranty tracking and renewal
  - `CustomerEMI.jsx` - EMI payment schedules
  - `CustomerProfile.jsx` - Profile management
- **Services**: `customerPortalService.js` - API client layer
- **Styling**: `CustomerPortal.css` - Responsive design

## Authentication

### Registration
- **Endpoint**: `POST /api/customer-auth/register`
- **Requirements**: Email must exist in customers database (from billing)
- **Process**: Customer creates password for existing email
- **Security**: bcrypt password hashing

### Login
- **Endpoint**: `POST /api/customer-auth/login`
- **Method**: Email + Password
- **Response**: JWT token (7-day expiry)
- **Session**: Token stored in localStorage/sessionStorage

### Change Password
- **Endpoint**: `POST /api/customer-auth/change-password`
- **Requirement**: Current password verification
- **Security**: Increments session version to invalidate old tokens

## Features

### 1. Dashboard (`/api/customer/dashboard`)
**Displays:**
- Member since date
- Total purchases count
- Total amount spent
- Active warranties count
- Expired warranties count
- Recent 5 purchases

**Tech:**
- Real-time stats calculation
- Aggregated from invoices and warranties collections
- Caching for performance

### 2. Invoices (`/api/customer/invoices`)
**Features:**
- Paginated invoice list (default 10 per page)
- Search by invoice number or date
- PDF download for each invoice
- Payment method display
- Item count per invoice

**Tech:**
- MongoDB pagination with skip/limit
- PDF generation on-the-fly
- Search filter on frontend

### 3. Warranties (`/api/customer/warranties`)
**Features:**
- Warranty status tracking (active, expiring soon, expired)
- Days remaining calculation
- Filter by status (all, active, expiring, expired)
- Warranty renewal option
- Product details and SKU

**Tech:**
- Auto-calculated expiry status
- 30-day "expiring soon" threshold
- One-click renewal (adds 1 year)

### 4. EMI Plans (`/api/customer/emi`)
**Features:**
- List all EMI plans
- Detailed payment schedule
- Installment status tracking (paid, pending, partial)
- Payment progress visualization
- Monthly EMI amount display

**Tech:**
- Zero-interest EMI calculation
- Installment-level tracking
- Progress bar with paid/pending amounts

### 5. Profile (`/api/customer/profile`)
**Features:**
- View profile information
- Edit name and phone
- Download business vCard
- Download membership card (PDF)
- Security information

**Tech:**
- PATCH endpoint for updates
- vCard generation
- PVC card PDF generation
- Email is read-only (login identifier)

## API Endpoints

### Authentication
```
POST /api/customer-auth/register
POST /api/customer-auth/login
POST /api/customer-auth/change-password
```

### Customer Portal (Protected - Requires JWT)
```
GET  /api/customer/dashboard
GET  /api/customer/invoices?page=1&limit=20
GET  /api/customer/invoices/<invoice_id>/pdf
GET  /api/customer/warranties?page=1&limit=20
POST /api/customer/warranties/<warranty_id>/renew
GET  /api/customer/emi?page=1&limit=20
GET  /api/customer/emi/<emi_id>
GET  /api/customer/profile
PATCH /api/customer/profile
GET  /api/customer/vcard
GET  /api/customer/pvc-card
```

## Security Features

1. **JWT Authentication**
   - HS256 algorithm
   - 7-day token expiry
   - Role-based access (customer role required)
   - Session versioning for instant logout

2. **Password Security**
   - bcrypt hashing (salt rounds: 10)
   - Minimum 6 characters
   - Current password required for changes

3. **Data Access Control**
   - Customers can only access their own data
   - Multi-field matching (ID, email, phone)
   - Ownership verification on all endpoints

4. **Input Validation**
   - Email format validation
   - Phone number validation (10 digits)
   - Required field checks
   - Type casting and sanitization

## User Experience

### Responsive Design
- Mobile-first approach
- Breakpoint at 768px
- Touch-friendly buttons
- Optimized navigation for small screens

### Loading States
- Spinner animations during data fetch
- Disabled buttons during operations
- Loading text feedback

### Error Handling
- User-friendly error messages
- Retry mechanisms
- Empty state displays
- Network error handling

### UI/UX Highlights
- Gradient branding (purple theme)
- Card-based layout
- Icon-enhanced navigation
- Status badges (color-coded)
- Hover animations
- Smooth transitions

## Database Schema

### Customers Collection
```javascript
{
  _id: ObjectId,
  email: String (indexed, unique),
  name: String,
  phone: String (indexed),
  accountPassword: String (bcrypt hashed),
  sessionVersion: Number,
  role: "customer",
  createdAt: DateTime,
  lastLogin: DateTime
}
```

### Bills Collection (Invoices)
```javascript
{
  _id: ObjectId,
  billNumber: String,
  customerId: ObjectId/String,
  customerName: String,
  customerPhone: String,
  customerEmail: String,
  billDate: DateTime,
  grandTotal: Number,
  paymentMode: String,
  items: Array
}
```

### Warranties Collection
```javascript
{
  _id: ObjectId,
  customerId: ObjectId/String,
  customerName: String,
  customerPhone: String,
  productName: String,
  productSku: String,
  warrantyType: String,
  startDate: DateTime,
  expiryDate: DateTime,
  status: String,
  invoiceNo: String
}
```

### EMI Plans Collection
```javascript
{
  _id: ObjectId,
  billId: ObjectId,
  customerId: ObjectId/String,
  customerName: String,
  customerPhone: String,
  principalAmount: Number,
  tenure: Number,
  monthlyEmi: Number,
  totalAmount: Number,
  status: String,
  installments: [{
    installmentNo: Number,
    dueDate: DateTime,
    amount: Number,
    paidAmount: Number,
    status: String,
    paidDate: DateTime
  }],
  createdAt: DateTime
}
```

## Performance Optimizations

1. **Pagination**
   - Default 10-20 items per page
   - Max 100 items per request
   - Skip/limit MongoDB queries

2. **Caching**
   - Frontend state caching
   - Reduced API calls on tab switching

3. **Lazy Loading**
   - Components loaded on demand
   - PDF generated on request only

4. **Indexing**
   - Email index (unique)
   - Phone index
   - Customer ID indexes

## Testing Checklist

### Authentication
- ✅ Registration with existing email
- ✅ Login with email + password
- ✅ JWT token generation
- ✅ Token expiry handling
- ✅ Password change with invalidation

### Features
- ✅ Dashboard stats display
- ✅ Invoice list pagination
- ✅ Invoice PDF download
- ✅ Warranty filtering by status
- ✅ Warranty renewal
- ✅ EMI list and details
- ✅ Profile view and edit
- ✅ vCard and PVC card download

### Edge Cases
- ✅ Empty states (no data)
- ✅ Error handling
- ✅ Invalid inputs
- ✅ Expired tokens
- ✅ Network failures

## Deployment

### Environment Variables
```
SECRET_KEY=<jwt-secret-key>
MONGO_URI=<mongodb-connection-string>
```

### Build Process
```bash
# Frontend
cd web-app/client
npm install
npm run build

# Backend
cd server-flask
pip install -r requirements.txt
python app.py
```

### Production Checklist
- ✅ Environment variables set
- ✅ MongoDB indexes created
- ✅ CORS configured
- ✅ HTTPS enabled
- ✅ Error logging configured

## Troubleshooting

### Common Issues

**Issue**: "No auth token provided"
- **Solution**: Ensure JWT token is included in Authorization header

**Issue**: "Customer not found"
- **Solution**: Verify email is registered in customers collection

**Issue**: "Failed to load dashboard"
- **Solution**: Check MongoDB connection and customer data exists

**Issue**: PDF download fails
- **Solution**: Verify invoice exists and belongs to customer

## Future Enhancements

1. **Two-Factor Authentication (2FA)**
   - SMS/Email OTP for additional security

2. **Order Tracking**
   - Real-time delivery status updates

3. **Payment Integration**
   - Online EMI payments
   - Digital wallet support

4. **Notifications**
   - Email alerts for warranty expiry
   - EMI payment reminders

5. **Analytics**
   - Purchase history charts
   - Spending analytics

## Support

For issues or questions:
- **Email**: support@2607electronics.com
- **Phone**: 7594012761
- **Documentation**: This file

## Changelog

### Version 2.0.0 (Complete Rebuild)
- ✅ Complete frontend rebuild with modern React
- ✅ Enhanced backend with proper error handling
- ✅ Added EMI management
- ✅ Improved security with JWT
- ✅ Responsive design for all devices
- ✅ Comprehensive documentation
- ✅ Better UX with loading states and error messages

---

**Last Updated**: April 1, 2026
**Status**: Production Ready
