const { test, expect } = require('@playwright/test');
const { loginAdmin, navigateToTab, getUniqueTimestamp } = require('./fixtures/test-helpers');

test.describe.serial('06. Financial Reports, Analytics & Transaction Reversal', () => {
  const timestamp = getUniqueTimestamp();
  const productName = `PW Reversal Item ${timestamp}`;
  const customerName = `PW Reversal Cust ${timestamp}`;
  const initialStock = 20;
  const soldQty = 2;

  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test('Reports & Analytics dashboard displays financial metrics', async ({ page }) => {
    await navigateToTab(page, 'Analytics');

    // Verify Reports view rendered
    await expect(page.locator('.reports')).toBeVisible();
    await expect(page.locator('.reports-title')).toContainText(/Reports/i);

    // Verify profit summary cards
    const reportSummary = page.locator('.report-summary').first();
    await expect(reportSummary).toBeVisible();
    await expect(reportSummary).toContainText(/Profit Summary/i);
    await expect(reportSummary).toContainText(/Total Sales/i);
    await expect(reportSummary).toContainText(/Net Revenue/i);
    await expect(reportSummary).toContainText(/Product Cost \(COGS\)/i);
  });

  test('Transaction Reversal: Stock deducted on sale and fully restored upon invoice deletion', async ({ page }) => {
    // 1. Create product with initial stock 20
    await navigateToTab(page, 'Inventory');
    await page.locator('button:has-text("Add Product")').click();
    await page.getByRole('textbox', { name: /Product Name/i }).fill(productName);
    await page.getByRole('spinbutton', { name: /Cost Price/i }).fill('4000');
    await page.getByRole('spinbutton', { name: /Final Selling Price/i }).fill('6000');
    await page.getByRole('spinbutton', { name: /Current Quantity/i }).fill(String(initialStock));
    await page.getByRole('spinbutton', { name: /Min Stock Alert/i }).fill('2');
    await page.locator('button[type="submit"]:has-text("Add Product")').click();
    await expect(page.getByRole('heading', { name: /Add New Product/i })).not.toBeVisible();

    // Verify product card initial stock in Inventory
    const invSearch = page.locator('input[placeholder*="Search products" i]');
    await invSearch.fill(productName);
    await page.waitForTimeout(500);
    const productCard = page.locator(`.product-card:has-text("${productName}")`);
    await expect(productCard).toBeVisible();
    await expect(productCard).toContainText(String(initialStock));

    // 2. Create customer
    await navigateToTab(page, 'CRM / Customers');
    await page.locator('button:has-text("Add Customer")').click();
    await page.getByRole('textbox', { name: /Customer Name/i }).fill(customerName);
    await page.getByRole('textbox', { name: /Phone Number/i }).fill(`9874${String(timestamp).slice(-6)}`);
    await page.locator('button[type="submit"]:has-text("Add Customer")').click();
    await expect(page.getByRole('heading', { name: /Add New Customer/i })).not.toBeVisible();

    // 3. POS Sale of 2 units
    await navigateToTab(page, 'New Sale');
    const posSearch = page.locator('.pos-search-bar input, input[placeholder*="Search products by name" i]');
    await posSearch.fill(productName);
    await page.waitForTimeout(400);
    await page.locator(`.pos-product-card:has-text("${productName}")`).first().click();

    // Increase qty from 1 to 2
    const cartItem = page.locator(`.cart-ng-item:has-text("${productName}")`);
    await expect(cartItem).toBeVisible();
    await cartItem.locator('button.cart-ng-qty-btn.plus').click();
    await expect(cartItem.locator('.cart-ng-qty-value')).toHaveText('2');

    // Select customer
    const custSearch = page.locator('.customer-search-input-modern, input[placeholder*="Search customer by name" i]');
    await custSearch.fill(customerName);
    await page.waitForTimeout(400);
    await page.locator(`.customer-option:has-text("${customerName}")`).first().click();

    // Complete cash sale
    await page.locator('button.complete-sale-btn').click();
    const notification = page.locator('.notification, .toast, .alert, div:has-text("Sale completed")').first();
    await expect(notification).toBeVisible({ timeout: 10000 });

    // 4. Verify stock decreased: 20 - 2 = 18
    await navigateToTab(page, 'Inventory');
    const invSearch2 = page.locator('input[placeholder*="Search products" i]');
    await invSearch2.fill(productName);
    await page.waitForTimeout(500);
    const productCardAfterSale = page.locator(`.product-card:has-text("${productName}")`);
    await expect(productCardAfterSale).toBeVisible();
    await expect(productCardAfterSale).toContainText(String(initialStock - soldQty));

    // 5. Navigate to Invoices / Billing History to perform reversal
    await navigateToTab(page, 'Billing History');
    const invListSearch = page.locator('.invoices-controls input, input[placeholder*="Search by invoice" i]');
    if (await invListSearch.isVisible()) {
      await invListSearch.fill(customerName);
      await page.waitForTimeout(400);
    }

    const targetInvoiceCard = page.locator('.invoice-card').filter({ hasText: customerName }).first();
    await expect(targetInvoiceCard).toBeVisible();

    // Click Delete on the target invoice
    await targetInvoiceCard.locator('button:has-text("Delete")').click();

    // Fill Admin Password in confirmation dialog
    const confirmDialog = page.locator('.confirm-dialog-content, .modal').filter({ hasText: 'Confirm' }).first();
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.locator('input.confirm-password-input').fill('admin123');
    await confirmDialog.locator('button:has-text("Delete")').click();

    // Wait for modal to close and invoice to be deleted
    await expect(confirmDialog).not.toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // 6. Verify stock is restored from 18 back to 20!
    await page.reload();
    await page.waitForLoadState('networkidle');
    await navigateToTab(page, 'Inventory');
    const invSearch3 = page.locator('input[placeholder*="Search products" i]');
    await invSearch3.fill(productName);
    await page.waitForTimeout(500);
    const productCardAfterReversal = page.locator(`.product-card:has-text("${productName}")`);
    await expect(productCardAfterReversal).toBeVisible();
    await expect(productCardAfterReversal).toContainText(String(initialStock));
  });
});
