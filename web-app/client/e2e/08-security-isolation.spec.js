const { test, expect } = require('@playwright/test');
const { loginAdmin, navigateToTab, getUniqueTimestamp } = require('./fixtures/test-helpers');

test.describe.serial('08. Security & Multi-Tenant Data Isolation', () => {
  const timestamp = getUniqueTimestamp();
  const customerA = {
    name: `Cust A ${timestamp}`,
    phone: `9871${String(timestamp).slice(-6)}`,
    email: `custA_${timestamp}@example.com`,
    password: 'Password@123'
  };
  const customerB = {
    name: `Cust B ${timestamp}`,
    phone: `9872${String(timestamp).slice(-6)}`,
    email: `custB_${timestamp}@example.com`,
    password: 'Password@123'
  };
  const productA = `Item For A ${timestamp}`;

  test('Setup: Admin creates distinct customer records and sale for Customer A', async ({ page }) => {
    await loginAdmin(page);

    // 1. Create Product
    await navigateToTab(page, 'Inventory');
    await page.locator('button:has-text("Add Product")').click();
    await page.getByRole('textbox', { name: /Product Name/i }).fill(productA);
    await page.getByRole('spinbutton', { name: /Cost Price/i }).fill('2000');
    await page.getByRole('spinbutton', { name: /Final Selling Price/i }).fill('3540');
    await page.getByRole('spinbutton', { name: /Current Quantity/i }).fill('10');
    await page.getByRole('spinbutton', { name: /Min Stock Alert/i }).fill('1');
    await page.locator('button[type="submit"]:has-text("Add Product")').click();
    await expect(page.getByRole('heading', { name: /Add New Product/i })).not.toBeVisible();

    // 2. Create Customer A
    await navigateToTab(page, 'CRM / Customers');
    await page.locator('button:has-text("Add Customer")').click();
    await page.getByRole('textbox', { name: /Customer Name/i }).fill(customerA.name);
    await page.getByRole('textbox', { name: /Phone Number/i }).fill(customerA.phone);
    await page.getByRole('textbox', { name: /Email Address/i }).fill(customerA.email);
    await page.locator('button[type="submit"]:has-text("Add Customer")').click();
    await expect(page.getByRole('heading', { name: /Add New Customer/i })).not.toBeVisible();

    // 3. Create Customer B
    await page.locator('button:has-text("Add Customer")').click();
    await page.getByRole('textbox', { name: /Customer Name/i }).fill(customerB.name);
    await page.getByRole('textbox', { name: /Phone Number/i }).fill(customerB.phone);
    await page.getByRole('textbox', { name: /Email Address/i }).fill(customerB.email);
    await page.locator('button[type="submit"]:has-text("Add Customer")').click();
    await expect(page.getByRole('heading', { name: /Add New Customer/i })).not.toBeVisible();

    // 4. POS Sale linked to Customer A ONLY
    await navigateToTab(page, 'New Sale');
    const posSearch = page.locator('.pos-search-bar input, input[placeholder*="Search products by name" i]');
    await posSearch.fill(productA);
    await page.waitForTimeout(400);
    await page.locator(`.pos-product-card:has-text("${productA}")`).first().click();

    const custSearch = page.locator('.customer-search-input-modern, input[placeholder*="Search customer by name" i]');
    await custSearch.fill(customerA.name);
    await page.waitForTimeout(400);
    await page.locator(`.customer-option:has-text("${customerA.name}")`).first().click();

    await page.locator('button.complete-sale-btn').click();
    const notification = page.locator('.notification, .toast, .alert, div:has-text("Sale completed")').first();
    await expect(notification).toBeVisible({ timeout: 10000 });
  });

  test('Customer B register/login cannot see Customer A private transactions', async ({ page }) => {
    // 1. Register Customer B
    await page.goto('/');
    await page.locator('button.ultra-segment-btn:has-text("CUSTOMER")').click();
    await page.locator('button.ultra-sub-tab:has-text("Register")').click();

    const regForm = page.locator('form:has-text("Email Address")');
    await regForm.locator('input[type="email"]').fill(customerB.email);
    await regForm.locator('input[placeholder="Minimum 6 characters"]').fill(customerB.password);
    await regForm.locator('input[placeholder="Re-enter your password"]').fill(customerB.password);
    await regForm.locator('button[type="submit"]:has-text("Create Account")').click();
    await expect(page.locator('.ultra-success-text')).toBeVisible({ timeout: 10000 });

    // 2. Login as Customer B
    await page.locator('button.ultra-sub-tab:has-text("Login")').click();
    const loginForm = page.locator('form:has-text("Email Address")');
    await loginForm.locator('input[type="email"]').fill(customerB.email);
    await loginForm.locator('input[placeholder="Enter your password"]').fill(customerB.password);
    await loginForm.locator('button[type="submit"]:has-text("Login")').click();

    await expect(page.locator('.customer-portal')).toBeVisible({ timeout: 10000 });

    // Customer B's dashboard must NOT show Customer A's name
    const welcomeHero = page.locator('.hero-content');
    await expect(welcomeHero).toContainText(customerB.name);
    await expect(welcomeHero).not.toContainText(customerA.name);

    // Customer B has 0 purchases
    const purchaseStat = page.locator('.stat-card:has-text("Total Purchases")');
    await expect(purchaseStat).toContainText('0');

    // Invoices list for Customer B must be empty
    await page.locator('.sidebar-nav button:has-text("Invoices")').click();
    await expect(page.locator('.customer-invoices')).toBeVisible();
    await expect(page.locator('.customer-invoices')).toContainText(/No invoices yet|No matches/i);
    await expect(page.locator(`.portal-table tbody tr:has-text("${productA}")`)).toHaveCount(0);
  });

  test('Unauthenticated API requests are blocked with HTTP 401/403', async ({ request }) => {
    // 1. Attempt admin endpoint without token
    const res1 = await request.get('http://localhost:5000/api/admin/audit-logs');
    expect([401, 403]).toContain(res1.status());

    // 2. Attempt checkout without token
    const res2 = await request.post('http://localhost:5000/api/checkout', {
      data: { items: [], total: 100 }
    });
    expect([401, 403]).toContain(res2.status());

    // 3. Attempt customer portal endpoint without customer token
    const res3 = await request.get('http://localhost:5000/api/customer/dashboard');
    expect([401, 403]).toContain(res3.status());
  });
});
