const { test, expect } = require('@playwright/test');
const { loginAdmin, navigateToTab, getUniqueTimestamp } = require('./fixtures/test-helpers');

test.describe('03. POS System, Cart Operations & Cash Sale', () => {
  const timestamp = getUniqueTimestamp();
  const productName = `PW POS TV ${timestamp}`;
  const customerName = `PW POS Cust ${timestamp}`;
  const phone = `9876${String(timestamp).slice(-6)}`;
  const email = `pw_pos_${timestamp}@example.com`;

  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test('Setup test product and customer for POS workflow', async ({ page }) => {
    // 1. Create Product: Price 23600 (Taxable 20000 + 18% GST 3600), Qty 10
    await navigateToTab(page, 'Inventory');
    await page.locator('button:has-text("Add Product")').click();
    
    await page.getByRole('textbox', { name: /Product Name/i }).fill(productName);
    await page.getByRole('spinbutton', { name: /Cost Price/i }).fill('15000');
    await page.getByRole('spinbutton', { name: /Final Selling Price/i }).fill('23600');
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

  test('POS Cart controls, price calculation, customer selection, and cash checkout', async ({ page }) => {
    await navigateToTab(page, 'New Sale');

    // 1. Search product
    const posSearch = page.locator('.pos-search-bar input, input[placeholder*="Search products by name" i]');
    await posSearch.fill(productName);
    await page.waitForTimeout(500);

    const productItem = page.locator(`.pos-product-card:has-text("${productName}")`);
    await expect(productItem).toBeVisible();
    
    // Add to cart
    await productItem.click();

    // Verify Cart Item appears
    const cartItem = page.locator(`.cart-ng-item:has-text("${productName}")`);
    await expect(cartItem).toBeVisible();
    await expect(cartItem.locator('.cart-ng-qty-value')).toHaveText('1');

    // 2. Test Quantity Increment (+)
    const plusBtn = cartItem.locator('button.cart-ng-qty-btn.plus');
    await plusBtn.click();
    await expect(cartItem.locator('.cart-ng-qty-value')).toHaveText('2');

    // Verify item total doubled
    await expect(cartItem.locator('.cart-ng-item-total')).toContainText(/47,?200/);

    // 3. Test Quantity Decrement (-)
    const minusBtn = cartItem.locator('button.cart-ng-qty-btn.minus');
    await minusBtn.click();
    await expect(cartItem.locator('.cart-ng-qty-value')).toHaveText('1');
    await expect(cartItem.locator('.cart-ng-item-total')).toContainText(/23,?600/);

    // 4. Customer Selection
    const custSearch = page.locator('.customer-search-input-modern, input[placeholder*="Search customer by name" i]');
    await custSearch.fill(customerName);
    await page.waitForTimeout(400);

    const custOption = page.locator(`.customer-option:has-text("${customerName}")`);
    await expect(custOption).toBeVisible();
    await custOption.click();

    // Verify Selected Customer card displayed
    const selectedCustCard = page.locator(`.selected-customer-card:has-text("${customerName}")`);
    await expect(selectedCustCard).toBeVisible();

    // 5. Verify Money Assertions in Order Summary
    const summary = page.locator('.checkout-summary-modern');
    await expect(summary).toBeVisible();

    // Subtotal (Excl. GST) -> 20,000.00
    await expect(summary).toContainText(/20,?000/);

    // CGST (9%) -> 1,800.00
    await expect(summary).toContainText(/1,?800/);

    // SGST (9%) -> 1,800.00
    await expect(summary).toContainText(/1,?800/);

    // Grand Total -> 23,600
    await expect(page.locator('.total-row .total-amount')).toContainText(/23,?600/);

    // 6. Complete Sale (Cash)
    const completeBtn = page.locator('button.complete-sale-btn');
    await expect(completeBtn).toBeEnabled();
    await completeBtn.click();

    // Verify completion notification
    const notification = page.locator('.notification, .toast, .alert, div:has-text("Sale completed")').first();
    await expect(notification).toBeVisible({ timeout: 10000 });
  });

  test('Stock is accurately decremented and invoice details are verified', async ({ page }) => {
    // 1. Check stock in Inventory
    await navigateToTab(page, 'Inventory');
    const searchInput = page.locator('input[placeholder*="Search products" i]');
    await searchInput.fill(productName);
    await page.waitForTimeout(500);

    const productCard = page.locator(`.product-card:has-text("${productName}")`);
    await expect(productCard).toBeVisible();
    // Initially 10, sold 1 -> now 9 units
    await expect(productCard).toContainText('9 units');

    // 2. Check invoice in Billing History
    await navigateToTab(page, 'Billing History');
    await page.waitForTimeout(500);

    const invoiceCard = page.locator(`.invoice-card:has-text("${customerName}")`).first();
    await expect(invoiceCard).toBeVisible();
    await expect(invoiceCard).toContainText(/23,?600/);

    // View invoice details
    await invoiceCard.locator('button:has-text("View")').click();

    const invoiceModal = page.locator('.modal-content:has-text("Invoice #")');
    await expect(invoiceModal).toBeVisible();
    await expect(invoiceModal).toContainText(customerName);
    await expect(invoiceModal).toContainText(productName);
    await expect(invoiceModal).toContainText(/23,?600/);
    await expect(invoiceModal).toContainText(/20,?000/); // Taxable base

    // Close invoice modal
    await invoiceModal.locator('button:has-text("×"), button.modal-close').first().click();
    await expect(invoiceModal).not.toBeVisible();
  });
});
