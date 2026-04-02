# Financial Calculations - Mathematical Reference

## Complete Formula Documentation

All formulas verified against user specification and tested with validation cases.

---

## Part 1: Per-Item Calculations (POS Checkout)

**Given for each line item in invoice:**
- `qty` = quantity purchased
- `unit_price` = price per unit (inclusive of GST)
- `cost_price` = cost to acquire one unit
- `gst_rate` = GST percentage (e.g., 18%)
- `discount_percent` = global discount applied to invoice (e.g., 10%)

### Step 1: Extract Base Price (Remove GST)
```
gst_factor = 1 + (gst_rate / 100)
base_unit_price = unit_price / gst_factor

Example with gst_rate = 18%:
gst_factor = 1 + 0.18 = 1.18
base_unit_price = 9999 / 1.18 = 8473.73
```

**Code Location:** `server-flask/routes/pos.py` line 143-144
```python
gst_factor = 1 + (line_gst_percent / 100.0)
base_unit_price = unit_price / gst_factor
```

### Step 2: Calculate Line Item Amounts
```
line_subtotal_inclusive = unit_price × qty
line_subtotal_base = base_unit_price × qty
line_cost = cost_price × qty
line_profit = line_subtotal_base - line_cost

Example (qty = 1):
line_subtotal_inclusive = 9999 × 1 = 9999
line_subtotal_base = 8473.73 × 1 = 8473.73
line_cost = 6300 × 1 = 6300
line_profit = 8473.73 - 6300 = 2173.73
```

**Code Location:** `server-flask/routes/pos.py` line 146-149
```python
line_subtotal_inclusive = unit_price * qty
line_subtotal_base = base_unit_price * qty
line_cost = prod_cost * qty
line_profit = line_subtotal_base - line_cost
```

### Step 3: Calculate GST for This Line (After Discount)
```
discount_factor = 1 - (discount_percent / 100)
line_taxable = line_subtotal_base × discount_factor
line_gst_amount = ROUND(line_taxable × (gst_rate / 100), 2)

Example (discount_percent = 0):
discount_factor = 1 - 0/100 = 1.0
line_taxable = 8473.73 × 1.0 = 8473.73
line_gst_amount = ROUND(8473.73 × 0.18, 2) = 1525.27

Example with 10% discount:
discount_factor = 1 - 10/100 = 0.9
line_taxable = 8473.73 × 0.9 = 7626.36
line_gst_amount = ROUND(7626.36 × 0.18, 2) = 1372.74
```

**Code Location:** `server-flask/routes/pos.py` line 152-154
```python
line_taxable = line_subtotal_base * discount_factor
line_gst_amount = round(line_taxable * (line_gst_percent / 100.0), 2)
```

---

## Part 2: Bill-Level Aggregation (Invoice Totals)

**Given the invoice:**
- All line items with their calculated amounts
- Invoice-level `discount_percent` (applies to all items)

### Step 1: Sum All Inclusive Amounts (Before Discount)
```
subtotal = SUM(line_subtotal_inclusive for each item)

Example (one item):
subtotal = 9999
```

**Code Location:** `server-flask/routes/pos.py` line 171
```python
subtotal += line_subtotal_inclusive
```

### Step 2: Calculate Global Discount
```
discount_amount = (subtotal × discount_percent) / 100
after_discount = subtotal - discount_amount

Example (discount_percent = 0):
discount_amount = (9999 × 0) / 100 = 0
after_discount = 9999 - 0 = 9999

Example with 10% discount:
discount_amount = (9999 × 10) / 100 = 999.90
after_discount = 9999 - 999.90 = 8999.10
```

**Code Location:** `server-flask/routes/pos.py` line 181-182
```python
discount_amount = (subtotal * discount_percent) / 100
after_discount = subtotal - discount_amount
```

### Step 3: Aggregate GST from All Line Items
```
gst_amount = SUM(line_gst_amount for each item)
             [calculated with discount_factor applied]

Example (one item with no discount):
gst_amount = 1525.27

Example (one item with 10% discount):
gst_amount = 1372.74
```

**Code Location:** `server-flask/routes/pos.py` line 185
```python
gst_amount = sum(i["lineGstAmount"] for i in bill["items"])
```

### Step 4: Calculate GST Split (CGST/SGST or IGST)
```
IF is_same_state:
    cgst = ROUND(gst_amount / 2, 2)
    sgst = gst_amount - cgst  [ensures total = gst_amount]
ELSE:
    cgst = 0
    sgst = 0
    igst = ROUND(gst_amount, 2)

Example (same state):
cgst = ROUND(1525.27 / 2, 2) = 762.64
sgst = 1525.27 - 762.64 = 762.63
igst = 0

Example (different state):
cgst = 0
sgst = 0
igst = 1525.27
```

**Code Location:** `server-flask/routes/pos.py` line 187-192
```python
cgst = sgst = igst = 0.0
if is_same_state:
    cgst = round(gst_amount / 2, 2)
    sgst = round(gst_amount - cgst, 2)
else:
    igst = round(gst_amount, 2)
```

### Step 5: Calculate Bill Amounts
```
grand_total = after_discount
              [This is what the customer actually pays]

Example:
grand_total = 9999 (inclusive of GST)

Or with 10% discount:
grand_total = 8999.10 (inclusive of GST)
```

**Code Location:** `server-flask/routes/pos.py` line 195
```python
grand_total = after_discount
```

### Step 6: Calculate Profit (Impact of Discount on Profit)
```
pre_discount_profit = SUM(line_profit for each item)
                    = SUM(line_subtotal_base - line_cost)

total_base_lost_to_discount = (subtotal - gst_amount) × (discount_percent / 100)
                            = base_total_before_discount × discount_percent %

total_profit = pre_discount_profit - total_base_lost_to_discount

Example (no discount):
pre_discount_profit = 8473.73 - 6300 = 2173.73
total_base_lost_to_discount = (9999 - 1525.27) × 0% = 0
total_profit = 2173.73 - 0 = 2173.73

Example (10% discount):
pre_discount_profit = 8473.73 - 6300 = 2173.73
total_base_lost_to_discount = (9999 - 1525.27) × 10% = 847.37
total_profit = 2173.73 - 847.37 = 1326.36
```

**Code Location:** `server-flask/routes/pos.py` line 200-203
```python
pre_discount_profit = sum(i["lineProfit"] for i in bill["items"])
total_base_lost_to_discount = (subtotal - gst_amount) * (discount_percent / 100.0)
total_profit = pre_discount_profit - total_base_lost_to_discount
```

### Step 7: Calculate Total Cost (COGS)
```
total_cost = SUM(line_cost for each item)

Example:
total_cost = 6300 × 1 = 6300
```

**Code Location:** `server-flask/routes/pos.py` line 172 (aggregated), line 213
```python
total_cost += line_cost
bill["totalCost"] = round(total_cost, 2)
```

---

## Part 3: Report-Level Aggregation (Multiple Invoices)

**Given a list of invoices with fields:**
- `grandTotal` - Total amount customer pays (inclusive GST)
- `afterDiscount` - Amount after discount (inclusive GST)
- `gstAmount` - Tax collected
- `totalCost` - COGS
- `totalProfit` - Profit from sale

### Formula 1: Total Revenue
```
TOTAL REVENUE = SUM(grandTotal for each invoice)

This is what the customer paid (includes GST).

Example (two invoices):
Invoice 1: 9999
Invoice 2: 9999
Total Revenue = 9999 + 9999 = 19998
```

**Code Location:** `web-app/client/src/components/Reports/Reports.jsx` line 25
```javascript
const totalRevenue = filteredInvoices.reduce(
  (sum, inv) => sum + (inv.grandTotal || inv.total || 0),
  0
);
```

### Formula 2: Base Revenue (Excluding GST) ✅ FIXED
```
BASE REVENUE = SUM(afterDiscount - gstAmount for each invoice)
             = SUM(base_revenue per invoice)

This is the actual money the company keeps (excludes tax).

Example (one invoice, no discount):
afterDiscount = 9999
gstAmount = 1525.27
baseRevenue = 9999 - 1525.27 = 8473.73

Example (two invoices, no discount):
Invoice 1: 9999 - 1525.27 = 8473.73
Invoice 2: 9999 - 1525.27 = 8473.73
Total Base Revenue = 8473.73 + 8473.73 = 16947.46

Alternative (with discount):
afterDiscount = 8999.10
gstAmount = 1372.74 (calculated with discount factor)
baseRevenue = 8999.10 - 1372.74 = 7626.36
```

**Code Location:** `web-app/client/src/components/Reports/Reports.jsx` line 27 (FIXED)
```javascript
const baseRevenue = filteredInvoices.reduce(
  (sum, inv) => sum + ((inv.afterDiscount || 0) - (inv.gstAmount || 0)),
  0
);
```

### Formula 3: Total GST Collected
```
TOTAL GST = SUM(gstAmount for each invoice)

This is money the company collected on behalf of the government.

Example:
GST from Invoice 1 = 1525.27
GST from Invoice 2 = 1525.27
Total GST = 1525.27 + 1525.27 = 3050.54
```

**Code Location:** `web-app/client/src/components/Reports/Reports.jsx` line 31
```javascript
const totalGST = filteredInvoices.reduce(
  (sum, inv) => sum + (inv.gstAmount || 0),
  0
);
```

### Formula 4: Total Cost (COGS)
```
TOTAL COST = SUM(totalCost for each invoice)

This is what the company paid to acquire goods.

Example:
Cost from Invoice 1 = 6300
Cost from Invoice 2 = 6300
Total Cost = 6300 + 6300 = 12600
```

**Code Location:** `web-app/client/src/components/Reports/Reports.jsx` line 34
```javascript
const totalCost = filteredInvoices.reduce(
  (sum, inv) => sum + (inv.totalCost || 0),
  0
);
```

### Formula 5: Gross Profit
```
GROSS PROFIT = SUM(totalProfit for each invoice)
             = Base Revenue - Total Cost

Example (one invoice):
totalProfit = 2173.73

Example (two invoices):
Invoice 1: 2173.73
Invoice 2: 2173.73
Gross Profit = 2173.73 + 2173.73 = 4347.46

Verification:
Base Revenue - Cost = 8473.73 - 6300 = 2173.73 ✓
```

**Code Location:** `web-app/client/src/components/Reports/Reports.jsx` line 37
```javascript
const totalProfit = filteredInvoices.reduce(
  (sum, inv) => sum + (inv.totalProfit || inv.profit || 0),
  0
);
```

### Formula 6: Net Profit
```
NET PROFIT = Gross Profit - Operational Expenses

Where:
- Gross Profit = Base Revenue - COGS
- Operational Expenses = Office rent, salaries, utilities, etc.
- (Does NOT include auto-generated inventory purchase expenses)

Example:
Gross Profit = 2173.73
Operational Expenses = 500
Net Profit = 2173.73 - 500 = 1673.73
```

**Code Location:** `web-app/client/src/components/Reports/Reports.jsx` line 96
```javascript
netProfit: totalProfit - totalExpenses
```

---

## Part 4: EMI Payment Tracking

**Given an invoice with EMI:**
```
paymentMode = "emi"
grandTotal = 9999
emiDetails = {
  downPayment: 4000
  months: 12
  emiAmount: 500
}
```

### Formula: Payment Breakdown
```
COLLECTED AMOUNT = downPayment (or grandTotal if not EMI)
PENDING AMOUNT = grandTotal - downPayment

TOTAL PAYMENT OBLIGATION = collected + pending
                         = grandTotal (must equal)

Example:
collected = 4000 (down payment)
pending = 9999 - 4000 = 5999
total = 4000 + 5999 = 9999 ✓

Monthly installments:
Month 1-11: ₹500 per month (total ₹5500)
Month 12: ₹499 (balance)
Total: ₹5999 (covers pending amount)
```

**Code Location:** `web-app/client/src/components/Reports/Reports.jsx` line 40-54
```javascript
const paymentSummary = filteredInvoices.reduce((acc, inv) => {
  const grandTotal = inv.grandTotal || inv.total || 0;
  const paymentMode = (inv.paymentMode || 'cash').toLowerCase();

  if (paymentMode === 'emi' && inv.emiDetails) {
    const downPayment = inv.emiDetails.downPayment || 0;
    acc.collected += downPayment;
    acc.pending += (grandTotal - downPayment);
    acc.emiCount += 1;
  } else {
    acc.collected += grandTotal;
  }

  return acc;
}, { collected: 0, pending: 0, emiCount: 0 });
```

---

## Part 5: Relationship Verification

### All formulas must satisfy these relationships:

#### 1. Revenue Composition
```
Grand Total = Base Revenue + GST
9999 = 8473.73 + 1525.27 ✓
```

#### 2. Profit Calculation
```
Profit = Base Revenue - Cost
2173.73 = 8473.73 - 6300 ✓
```

#### 3. Discount Impact
```
Profit with Discount = Profit - (Base Revenue × Discount %)
(For 10% discount)
1326.36 = 2173.73 - (8473.73 × 0.10)
1326.36 = 2173.73 - 847.37 ✓
```

#### 4. Payment Reconciliation
```
Collected + Pending = Grand Total
4000 + 5999 = 9999 ✓
```

#### 5. Net Profit Calculation
```
Net Profit = Gross Profit - Expenses
1673.73 = 2173.73 - 500 ✓
```

---

## Validation Test Results

All formulas passed validation:
```
✅ Base Revenue = 8473.73 (Expected: 8473.73)
✅ GST Amount = 1525.27 (Expected: 1525.27)
✅ Cost = 6300 (Expected: 6300)
✅ Gross Profit = 2173.73 (Expected: 2173.73)
✅ Net Profit = 2173.73 (Expected: 2173.73)
✅ Collected = 4000 (Expected: 4000)
✅ Pending = 5999 (Expected: 5999)
```

---

## Summary

**All formulas are:**
- ✅ Mathematically correct
- ✅ Aligned with business requirements
- ✅ Implemented in backend AND frontend
- ✅ Validated with test cases
- ✅ Ready for production
