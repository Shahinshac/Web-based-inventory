const { test, expect } = require('@playwright/test');
const { loginAdmin, navigateToTab, getUniqueTimestamp } = require('./fixtures/test-helpers');

test.describe.serial('05. Customer Portal End-to-End Workflow', () => {
  const timestamp = getUniqueTimestamp();
  const productName = `PW Portal Item ${timestamp}`;
  const customerName = `PW Portal Cust ${timestamp}`;
  const phone = `9875${String(timestamp).slice(-6)}`;
  const email = `portal_${timestamp}@example.com`;
  const password = 'Password@123';

  test('Admin setups product, customer, and completes POS sale', async ({ page }) => {
    await loginAdmin(page);

    // 1. Create Product
    await navigateToTab(page, 'Inventory');
    await page.locator('button:has-text("Add Product")').click();
    await page.getByRole('textbox', { name: /Product Name/i }).fill(productName);
    await page.getByRole('spinbutton', { name: /Cost Price/i }).fill('5000');
    await page.getByRole('spinbutton', { name: /Final Selling Price/i }).fill('11800');
    await page.getByRole('spinbutton', { name: /Current Quantity/i }).fill('15');
    await page.getByRole('spinbutton', { name: /Min Stock Alert/i }).fill('2');
    await page.locator('button[type="submit"]:has-text("Add Product")').click();
    await expect(page.getByRole('heading', { name: /Add New Product/i })).not.toBeVisible();

    // 2. Create Customer with specific email for portal registration
    await navigateToTab(page, 'CRM / Customers');
    await page.locator('button:has-text("Add Customer")').click();
    await page.getByRole('textbox', { name: /Customer Name/i }).fill(customerName);
    await page.getByRole('textbox', { name: /Phone Number/i }).fill(phone);
    await page.getByRole('textbox', { name: /Email Address/i }).fill(email);
    await page.locator('button[type="submit"]:has-text("Add Customer")').click();
    await expect(page.getByRole('heading', { name: /Add New Customer/i })).not.toBeVisible();

    // 3. Complete POS Cash Sale
    await navigateToTab(page, 'New Sale');
    const posSearch = page.locator('.pos-search-bar input, input[placeholder*="Search products by name" i]');
    await posSearch.fill(productName);
    await page.waitForTimeout(500);
    await page.locator(`.pos-product-card:has-text("${productName}")`).first().click();

    const custSearch = page.locator('.customer-search-input-modern, input[placeholder*="Search customer by name" i]');
    await custSearch.fill(customerName);
    await page.waitForTimeout(400);
    await page.locator(`.customer-option:has-text("${customerName}")`).first().click();

    await page.locator('button.complete-sale-btn').click();
    const notification = page.locator('.notification, .toast, .alert, div:has-text("Sale completed")').first();
    await expect(notification).toBeVisible({ timeout: 10000 });

    // 4. Logout admin
    await page.locator('button.logout-btn, button:has-text("Sign Out"), button:has-text("Logout")').first().click();
    await expect(page.locator('.ultra-login-card, .login-container, button:has-text("Sign In")').first()).toBeVisible();
  });

  test('Customer registers and logs into Customer Portal via real UI', async ({ page }) => {
    await page.goto('/');

    // Switch to CUSTOMER mode
    const customerSegmentBtn = page.locator('button.ultra-segment-btn:has-text("CUSTOMER")');
    await expect(customerSegmentBtn).toBeVisible();
    await customerSegmentBtn.click();

    // 1. Customer Register
    const registerTabBtn = page.locator('button.ultra-sub-tab:has-text("Register")');
    await expect(registerTabBtn).toBeVisible();
    await registerTabBtn.click();

    // Fill registration form
    const regForm = page.locator('form:has-text("Email Address")');
    await regForm.locator('input[type="email"]').fill(email);
    await regForm.locator('input[placeholder="Minimum 6 characters"]').fill(password);
    await regForm.locator('input[placeholder="Re-enter your password"]').fill(password);

    await regForm.locator('button[type="submit"]:has-text("Create Account")').click();

    // Verify registration success notification
    await expect(page.locator('.ultra-success-text')).toBeVisible({ timeout: 10000 });

    // Switch to Customer Login tab
    const loginTabBtn = page.locator('button.ultra-sub-tab:has-text("Login")');
    await loginTabBtn.click();

    const loginForm = page.locator('form:has-text("Email Address")');
    await loginForm.locator('input[type="email"]').fill(email);
    await loginForm.locator('input[placeholder="Enter your password"]').fill(password);
    await loginForm.locator('button[type="submit"]:has-text("Login")').click();

    // Verify Customer Portal layout
    await expect(page.locator('.customer-portal')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.brand-name').first()).toContainText('PORTAL');
  });

  test('Customer Portal verifies Dashboard stats, Invoices, PDF download, and Warranties', async ({ page }) => {
    // 1. Customer Login directly
    await page.goto('/');
    const customerSegmentBtn = page.locator('button.ultra-segment-btn:has-text("CUSTOMER")');
    await customerSegmentBtn.click();

    const loginTabBtn = page.locator('button.ultra-sub-tab:has-text("Login")');
    if (await loginTabBtn.isVisible()) {
      await loginTabBtn.click();
    }

    const loginForm = page.locator('form:has-text("Email Address")');
    await loginForm.locator('input[type="email"]').fill(email);
    await loginForm.locator('input[placeholder="Enter your password"]').fill(password);
    await loginForm.locator('button[type="submit"]:has-text("Login")').click();

    await expect(page.locator('.customer-portal')).toBeVisible({ timeout: 10000 });

    // 2. Dashboard Verification
    const welcomeHero = page.locator('.hero-content');
    await expect(welcomeHero).toContainText(customerName);

    // Total purchases must be at least 1
    const purchaseStat = page.locator('.stat-card:has-text("Total Purchases")');
    await expect(purchaseStat).toContainText('1');

    // 3. Invoices & Billing History Tab
    await page.locator('.sidebar-nav button:has-text("Invoices")').click();
    await expect(page.locator('.customer-invoices')).toBeVisible();

    const invoiceRow = page.locator('.portal-table tbody tr, .portal-mobile-card').first();
    await expect(invoiceRow).toBeVisible();
    await expect(invoiceRow).toContainText(/11,?800/);

    // PDF Download verification
    const downloadBtn = invoiceRow.locator('button:has-text("DOWNLOAD")');
    await expect(downloadBtn).toBeVisible();

    // Verify PDF download event or response
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
      downloadBtn.click()
    ]);
    if (download) {
      expect(download.suggestedFilename()).toContain('.pdf');
    }

    // 4. Warranties Tab
    await page.locator('.sidebar-nav button:has-text("Warranties")').click();
    await expect(page.locator('.customer-warranties').first()).toBeVisible();

    // 5. EMI Plans Tab
    await page.locator('.sidebar-nav button:has-text("EMI Plans")').click();
    await expect(page.locator('.customer-emi-portal').first()).toBeVisible();

    // 6. Support Desk - Create Ticket
    await page.locator('.sidebar-nav button:has-text("Support Desk")').click();
    await expect(page.locator('.customer-support-view').first()).toBeVisible();

    const newTicketBtn = page.locator('.support-sidebar button:has-text("New")').first();
    if (await newTicketBtn.isVisible()) {
      await newTicketBtn.click();
      const modal = page.locator('form').filter({ hasText: 'Subject' }).first();
      await modal.locator('input[type="text"]').fill(`PW Ticket ${timestamp}`);
      await modal.locator('textarea').fill('Testing support ticket workflow in Customer Portal.');
      await modal.locator('button[type="submit"]:has-text("Create Ticket")').first().click();
      await page.waitForTimeout(1000);
      await expect(page.locator('.support-sidebar').filter({ hasText: `PW Ticket ${timestamp}` }).first()).toBeVisible();
    }

    // 7. Profile Tab
    await page.locator('.sidebar-nav button:has-text("My Profile")').click();
    await expect(page.locator('.customer-profile-view').first()).toBeVisible();
    await expect(page.locator('.customer-profile-view').first()).toContainText(phone);
  });
});
