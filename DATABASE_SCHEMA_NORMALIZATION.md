# Database Schema Normalization - PK/FK Relationships

**Date**: 2026-04-02
**Database**: MongoDB (Atlas)
**Status**: Documentation for referential integrity

---

## Overview

MongoDB uses document embedding and references instead of traditional SQL foreign keys. This document outlines the relationships and recommended indexes for data integrity.

---

## Schema Relationships

### 1. **Users ↔ Bills/Invoices** (One-to-Many)

```
users._id (PK)
    ↓ (createdBy)
bills.createdBy (FK → users._id)
```

**Collections:**
- `users` - Stores staff/admin accounts
- `bills` - Stores invoice data

**Fields:**
```javascript
// users collection
{
  _id: ObjectId,          // Primary Key
  username: String,
  email: String,
  role: String            // admin, staff
}

//  bills collection
{
  _id: ObjectId,          // Primary Key
  createdBy: ObjectId,    // FK → users._id
  createdByUsername: String,
  billNumber: String
}
```

**Index:**
```javascript
db.bills.create_index("createdBy")
```

---

### 2. **Customers ↔ Bills** (One-to-Many)

```
customers._id (PK)
    ↓ (customerId)
bills.customerId (FK → customers._id)
```

**Collections:**
- `customers` - Customer master data
- `bills` - Invoice records

**Fields:**
```javascript
// customers collection
{
  _id: ObjectId,          // Primary Key
  name: String,
  email: String,
  phone: String,
  address: String
}

// bills collection
{
  _id: ObjectId,          // Primary Key
  customerId: ObjectId,   // FK → customers._id
  customerName: String,
  customerEmail: String,
  customerPhone: String
}
```

**Indexes:**
```javascript
db.customers.create_index("email", { unique: true })
db.customers.create_index("phone")
db.bills.create_index("customerId")
db.bills.create_index("customerEmail")
db.bills.create_index("customerPhone")
```

---

### 3. **Bills ↔ Invoice Items** (One-to-Many)

```
bills._id (PK)
    ↓ (stored in bills.items array)
bills.items[].productId (FK → products._id)
```

**Collections:**
- `bills` - Invoice headers
- `bills.items[]` - Line items (embedded)

**Fields:**
```javascript
// bills collection
{
  _id: ObjectId,          // Primary Key
  billNumber: String,
  items: [                // Embedded array (One-to-Many)
    {
      productId: ObjectId, // FK → products._id
      productName: String,
      quantity: Number,
      unitPrice: Number,
      lineSubtotal: Number
    }
  ]
}
```

**Index:**
```javascript
// No additional index needed for embedded array items
// Bills are already indexed by billNumber and billDate
```

---

### 4. **Products ↔ Bills** (Many-to-Many via Bills.items)

```
products._id (PK)
    ↓ (referenced in bills.items[].productId)
bills.items[].productId (FK → products._id)
```

**Collections:**
- `products` - Product catalog
- `bills.items[]` - Cross-reference through invoice items

**Fields:**
```javascript
// products collection
{
  _id: ObjectId,          // Primary Key
  name: String,
  costPrice: Number,
  quantity: Number,
  minStock: Number
}

// bills.items reference
{
  productId: ObjectId,    // FK → products._id
  productName: String,
  quantity: Number
}
```

**Indexes:**
```javascript
db.products.create_index("name")
db.products.create_index("quantity")
```

---

### 5. **Bills ↔ EMI Plans** (One-to-One)

```
bills._id (PK)
    ↓ (reference)
emi_plans.billId (FK → bills._id)
```

**Collections:**
- `bills` - Invoice records
- `emi_plans` - EMI financing plans

**Fields:**
```javascript
// bills collection
{
  _id: ObjectId,          // Primary Key
  billNumber: String,
  emiPlanId: ObjectId,    // FK → emi_plans._id
  emiEnabled: Boolean
}

// emi_plans collection
{
  _id: ObjectId,          // Primary Key
  billId: ObjectId,       // FK → bills._id
  customerId: ObjectId,   // FK → customers._id
  tenure: Number,
  downPayment: Number,
  startDate: DateTime,
  endDate: DateTime
}
```

**Indexes:**
```javascript
db.emi_plans.create_index("billId")
db.emi_plans.create_index("customerId")
```

---

### 6. **EMI Plans ↔ Installments** (One-to-Many)

```
emi_plans._id (PK)
    ↓ (stored in emi_plans.installments array)
emi_plans.installments[].installmentNo (Local Key)
```

**Collections:**
- `emi_plans` - EMI plan header
- `emi_plans.installments[]` - Installment records (embedded)

**Fields:**
```javascript
// emi_plans collection
{
  _id: ObjectId,          // Primary Key
  billId: ObjectId,       // FK → bills._id
  customerId: ObjectId,   // FK → customers._id
  installments: [         // Embedded array (One-to-Many)
    {
      installmentNo: Number,
      dueDate: DateTime,
      amount: Number,
      paidAmount: Number,
      status: String      // pending, partial, paid
    }
  ]
}
```

---

### 7. **Customers ↔ Warranties** (One-to-Many)

```
customers._id (PK)
    ↓ (customerId)
warranties.customerId (FK → customers._id)
```

**Collections:**
- `customers` - Customer master
- `warranties` - Warranty records

**Fields:**
```javascript
// warranties collection
{
  _id: ObjectId,          // Primary Key
  customerId: ObjectId,   // FK → customers._id
  invoiceNo: String,      // Reference to bill
  startDate: DateTime,
  expiryDate: DateTime,
  status: String          // active, expired
}
```

**Indexes:**
```javascript
db.warranties.create_index("customerId")
db.warranties.create_index("expiryDate")
db.warranties.create_index("invoiceNo")
```

---

### 8. **Bills ↔ Audit Log** (One-to-Many)

```
bills._id (PK)
    ↓ (entityId in audit)
audit_logs.entityId (FK → bills._id for sales)
```

**Collections:**
- `bills` - Invoice records
- `audit_logs` - Activity tracking

**Fields:**
```javascript
// audit_logs collection
{
  _id: ObjectId,          // Primary Key
  userId: ObjectId,       // FK → users._id
  entity: String,         // "SALE", "EMI", etc.
  entityId: String,       // Reference to entity _id
  action: String,
  timestamp: DateTime
}
```

**Indexes:**
```javascript
db.audit_logs.create_index("userId")
db.audit_logs.create_index("entityId")
db.audit_logs.create_index("timestamp")
```

---

## Referential Integrity Constraints

### ON DELETE CASCADE Scenarios

Since MongoDB doesn't enforce foreign key constraints natively, implement these rules in application code:

| Parent | Child | Action | Implementation |
|--------|-------|--------|-----------------|
| customers._id | bills | DELETE | Delete related bills and EMI plans |
| bills._id | emi_plans | DELETE | Delete EMI plan and installments |
| products._id | bills.items | DELETE | Cannot delete (would break invoice integrity) |

---

## Data Consistency Checklist

- ✅ All `_id` fields are ObjectId
- ✅ All FK fields match parent `_id` type (ObjectId)
- ✅ Indexes created on FK fields for query performance
- ✅ Unique constraints on email, phone, billNumber
- ✅ Sparse indexes for optional fields
- ✅ Timestamps stored as UTC with timezone awareness
- ✅ No orphan records (application enforces cascading rules)

---

## Timestamp Handling

All dates stored in UTC:

```javascript
// Backend creates with timezone awareness
from utils.tzutils import utc_now
bill_date = utc_now()  // 2026-04-02T15:30:45+00:00

// Returned to frontend as ISO string
"billDate": "2026-04-02T15:30:45+00:00"

// Frontend converts to IST for display
formatTimestampIST("2026-04-02T15:30:45+00:00")
// Returns: "02 Apr 2026, 08:15 PM"
```

---

## EMI Date Tracking

All EMI plans include start and end dates:

```javascript
emi_plans: {
  _id: ObjectId,
  billId: ObjectId,
  startDate: DateTime,      // UTC - Loan start
  endDate: DateTime,        // UTC - Final payment due
  tenure: Number,           // Months
  installments: [
    {
      installmentNo: Number,
      dueDate: DateTime,    // UTC
      amount: Number,
      status: String        // pending, partial, paid
    }
  ]
}
```

---

## Query Examples

### 1. Get All Bills for a Customer

```javascript
db.bills.find({ "customerId": ObjectId("...") })
  .sort({ "billDate": -1 })
```

### 2. Get All EMI Plans for a Customer

```javascript
db.emi_plans.find({ "customerId": ObjectId("...") })
  .sort({ "startDate": -1 })
```

### 3. Get Pending Installments

```javascript
db.emi_plans.find({
  "customerId": ObjectId("..."),
  "installments.status": { $in: ["pending", "partial"] }
})
```

### 4. Get Expired Warranties

```javascript
db.warranties.find({
  "expiryDate": { $lt: new Date() },
  "status": "active"
})
```

---

## Indexes Summary

```python
# Core indexes for performance
db.users.create_index("username", unique=True)
db.users.create_index("email", unique=True, sparse=True)
db.users.create_index("role")

db.customers.create_index("email", unique=True, sparse=True)
db.customers.create_index("phone", sparse=True)

db.bills.create_index("billNumber", unique=True)
db.bills.create_index("customerId")
db.bills.create_index("billDate")
db.bills.create_index("createdBy")

db.emi_plans.create_index("billId")
db.emi_plans.create_index("customerId")

db.warranties.create_index("customerId")
db.warranties.create_index("expiryDate")

db.audit_logs.create_index("userId")
db.audit_logs.create_index("entityId")
db.audit_logs.create_index("timestamp")
```

---

## Data Integrity Best Practices

1. **Always validate FK before inserting** - Check parent exists
2. **Use transactions for multi-document updates** - Maintain consistency
3. **Implement cascading deletes** - Clean up child records in app code
4. **Regular audit trail** - Track all modifications
5. **Backup strategy** - Daily/hourly snapshots
6. **Data validation** - Type checking and range validation

---

**Appendix:**

All timestamp fields use UTC timezone-aware datetime objects. Frontend utilities perform automatic conversion to IST for display. PDF invoices use backend formatting utilities for consistent timezone handling.
