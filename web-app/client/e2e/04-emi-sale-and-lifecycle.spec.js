const { test, expect } = require('@playwright/test');
const { loginAdmin, navigateToTab, getUniqueTimestamp } = require('./fixtures/test-helpers');

test.describe.serial('04. EMI Sale, Automatic Schedule, Overpayment Protection & Installments', () => {
  const timestamp = getUniqueTimestamp();
  const productName = `PW EMI TV ${timestamp}`;
  const customerName = `PW EMI Cust ${timestamp}`;
  const phone = `9876${String(timestamp).slice(-6)}`;
  const email = `pw_emi_${timestamp}@example.com`;

  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test('Setup product and customer for EMI workflow', async ({ page }) => {
    // 1. Create Product: Price 35400, Qty 10
    await navigateToTab(page, 'Inventory');
    await page.locator('button:has-text("Add Product")').click();
    
    await page.getByRole('textbox', { name: /Product Name/i }).fill(productName);
    await page.getByRole('spinbutton', { name: /Cost Price/i }).fill('25000');
    await page.getByRole('spinbutton', { name: /Final Selling Price/i }).fill('35400');
    await page.getByRole('spinbutton', { name: /Current Quantity/i }).fill('10');
    await page.getByRole('spinbutton', { name: /Min Stock Alert/i }).fill('2');
    await page.locator('button[type="submit"]:has-text("Add Product")').click();
    await expect(page.getByRole('heading', { name: /Add New Product/i })).not.toBeVisible();

    // 2. Create Customer
    await navigateToTab(page, 'CRM / Customers');
    await page.locator('button:has-text("Add Customer")').click();
    await page.getByRole('textbox', { name: /Customer Name/i }).fill(customerName);
    await page.getByRole('textbox', { name: /Phone Number/i }).fill(phone);
    await page.getByRole('textbox', { name: /Email Address/i }).fill(email);
    await page.locator('button[type="submit"]:has-text("Add Customer")').click();
    await expect(page.getByRole('heading', { name: /Add New Customer/i })).not.toBeVisible();
  });

  test('POS EMI Checkout with tenure, down payment, auto-calculation, and sale completion', async ({ page }) => {
    await navigateToTab(page, 'New Sale');

    // 1. Search product and add to cart
    const posSearch = page.locator('.pos-search-bar input, input[placeholder*="Search products by name" i]');
    await posSearch.fill(productName);
    await page.waitForTimeout(500);

    const productItem = page.locator(`.pos-product-card:has-text("${productName}")`);
    await expect(productItem).toBeVisible();
    await productItem.click();

    // 2. Select Customer
    const custSearch = page.locator('.customer-search-input-modern, input[placeholder*="Search customer by name" i]');
    await custSearch.fill(customerName);
    await page.waitForTimeout(400);

    const custOption = page.locator(`.customer-option:has-text("${customerName}")`);
    await expect(custOption).toBeVisible();
    await custOption.click();

    // 3. Select EMI payment method
    const emiCard = page.locator('.payment-method-card:has-text("EMI")');
    await expect(emiCard).toBeVisible();
    await emiCard.click();

    // 4. Fill EMI Schedule Details
    const tenureSelect = page.locator('.emi-details-form select');
    await expect(tenureSelect).toBeVisible();
    await tenureSelect.selectOption('3');

    const downPaymentInput = page.locator('.emi-details-form input[placeholder="0.00"]');
    await downPaymentInput.fill('5400');

    // Verify financed amount and monthly EMI auto calculation:
    // Total: 35,400, Down: 5,400 -> Financed: 30,000 -> Monthly EMI: 10,000
    const emiDetailsBox = page.locator('.emi-details-form');
    await expect(emiDetailsBox).toContainText(/30,?000/);

    const monthlyEmiInput = page.locator('.emi-details-form input[placeholder="Auto-calculated"]');
    await expect(monthlyEmiInput).toHaveValue('10000');

    // 5. Complete Sale
    const completeBtn = page.locator('button.complete-sale-btn');
    await completeBtn.click();

    // Notification confirms sale
    const notification = page.locator('.notification, .toast, .alert, div:has-text("Sale completed")').first();
    await expect(notification).toBeVisible({ timeout: 10000 });
    await expect(notification).toContainText(/Sale completed/i);
  });

  test('Admin EMI Tracker verifies schedule, validates overpayment rejection and processes installment', async ({ page }) => {
    await navigateToTab(page, 'EMI Dashboard');
    await page.waitForTimeout(1000);

    // Filter or search customer
    const searchInput = page.locator('.emi-filters-bar input, input[placeholder*="Search by customer" i]');
    if (await searchInput.isVisible()) {
      await searchInput.fill(customerName);
      await page.waitForTimeout(500);
    }

    const customerRow = page.locator(`tr:has-text("${customerName}")`);
    await expect(customerRow).toBeVisible();
    await expect(customerRow).toContainText('3 Months');
    await expect(customerRow).toContainText(/10,?000/);

    // Click VIEW DETAILS
    await customerRow.locator('button:has-text("VIEW DETAILS")').click();

    // Verify EMI Schedule view
    const title = page.locator('.section-title');
    await expect(title).toContainText('EMI Details:');
    await expect(page.locator('.emi-stats-grid')).toContainText(customerName);
    await expect(page.locator('.emi-stats-grid')).toContainText('3 Months');

    // Verify table has 3 installments
    const installments = page.locator('.emi-table tbody tr');
    await expect(installments).toHaveCount(3);
    await expect(installments.nth(0)).toContainText(/10,?000/);
    await expect(installments.nth(1)).toContainText(/10,?000/);
    await expect(installments.nth(2)).toContainText(/10,?000/);

    // Extract auth token from localStorage to test backend payment & overpayment protection
    const token = await page.evaluate(() => localStorage.getItem('authToken') || localStorage.getItem('token'));
    
    // Fetch customer's EMI plans via API
    const plansRes = await page.request.get('http://localhost:5000/api/admin/emi-plans', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(plansRes.status()).toBe(200);
    const plansData = await plansRes.json();
    const plan = (plansData.emiPlans || []).find(p => p.customerName && p.customerName.includes(customerName));
    if (!plan) {
      console.log('Available plans:', JSON.stringify(plansData.emiPlans?.map(p => ({ id: p.id, customerName: p.customerName, billNumber: p.billNumber }))));
      console.log('Target customerName:', customerName);
    }
    expect(plan).toBeDefined();

    // TEST 1: Overpayment Protection
    // Installment 1 due amount is 10,000. Attempt to pay 15,000 -> must return HTTP 400
    const overpayRes = await page.request.patch(`http://localhost:5000/api/emi/${plan.id}/payment`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { installmentNo: 1, amount: 15000, paymentMethod: 'cash' }
    });
    expect(overpayRes.status()).toBe(400);
    const overpayData = await overpayRes.json();
    expect(overpayData.error).toContain('Payment exceeds remaining due amount');

    // TEST 2: Valid Installment Payment
    // Pay exact installment amount: 10,000
    const validPayRes = await page.request.patch(`http://localhost:5000/api/emi/${plan.id}/payment`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { installmentNo: 1, amount: 10000, paymentMethod: 'cash' }
    });
    expect(validPayRes.status()).toBe(200);

    // Refresh UI to verify status update
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Navigate back to EMI plan details
    await navigateToTab(page, 'EMI Dashboard');
    const updatedRow = page.locator(`tr:has-text("${customerName}")`);
    await updatedRow.locator('button:has-text("VIEW DETAILS")').click();

    // Verify installment 1 is now completed
    const updatedInst1 = page.locator('.emi-table tbody tr').nth(0);
    await expect(updatedInst1).toContainText(/completed/i);
  });
});
