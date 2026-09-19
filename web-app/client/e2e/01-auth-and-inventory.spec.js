const { test, expect } = require('@playwright/test');
const { loginAdmin, navigateToTab, getUniqueTimestamp } = require('./fixtures/test-helpers');

test.describe('01. Authentication & Inventory Management', () => {
  const timestamp = getUniqueTimestamp();
  const productName = `PW Test Smart TV ${timestamp}`;

  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test('Admin Login succeeds and displays navigation', async ({ page }) => {
    await expect(page.locator('aside.premium-sidebar')).toBeVisible();
    await expect(page.locator('button.nav-btn:has-text("Inventory")')).toBeVisible();
    await expect(page.locator('button.nav-btn:has-text("New Sale")')).toBeVisible();
    await expect(page.locator('button.nav-btn:has-text("CRM / Customers")')).toBeVisible();
  });

  test('Product Creation with numeric input hardening and leading-zero prevention', async ({ page }) => {
    await navigateToTab(page, 'Inventory');
    
    // Click Add Product
    const addBtn = page.locator('button:has-text("Add Product")');
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Verify modal opened
    const modalHeading = page.getByRole('heading', { name: /Add New Product/i });
    await expect(modalHeading).toBeVisible();

    // Verify numeric input validation and leading-zero stripping:
    // Test: 5, 10, 100, 1000, 10000, decimals, and ensure leading zeros are stripped
    const costInput = page.getByRole('spinbutton', { name: /Cost Price/i });
    await expect(costInput).toBeVisible();

    // Test input '0005' -> should normalize without leading zeroes
    await costInput.fill('0005');
    await costInput.blur();
    const val5 = await costInput.inputValue();
    expect(val5).toBe('5');

    // Test 10
    await costInput.fill('10');
    await costInput.blur();
    expect(await costInput.inputValue()).toBe('10');

    // Test 100
    await costInput.fill('100');
    await costInput.blur();
    expect(await costInput.inputValue()).toBe('100');

    // Test 1000
    await costInput.fill('1000');
    await costInput.blur();
    expect(await costInput.inputValue()).toBe('1000');

    // Test 10000
    await costInput.fill('10000');
    await costInput.blur();
    expect(await costInput.inputValue()).toBe('10000');

    // Test decimal input 15000.50
    await costInput.fill('15000.50');
    await costInput.blur();
    expect(await costInput.inputValue()).toBe('15000.50');

    // Set actual product values
    await costInput.fill('15000');

    // Set Product Name
    const nameInput = page.getByRole('textbox', { name: /Product Name/i });
    await nameInput.fill(productName);

    // Set Selling Price (Final price incl GST)
    const priceInput = page.getByRole('spinbutton', { name: /Final Selling Price/i });
    await priceInput.fill('23600');

    // Set Quantity
    const qtyInput = page.getByRole('spinbutton', { name: /Current Quantity/i });
    await qtyInput.fill('20');

    // Set Min Stock
    const minStockInput = page.getByRole('spinbutton', { name: /Min Stock Alert/i });
    await minStockInput.fill('5');

    // Submit form
    const submitBtn = page.locator('button[type="submit"]:has-text("Add Product")');
    await submitBtn.click();

    // Wait for modal to close
    await expect(modalHeading).not.toBeVisible();

    // Verify product exists in product list
    const searchInput = page.locator('input[placeholder*="Search products" i]');
    await searchInput.fill(productName);
    await page.waitForTimeout(500);

    const productCard = page.locator(`.product-card:has-text("${productName}")`);
    await expect(productCard).toBeVisible();
    await expect(productCard).toContainText('20');
  });

  test('Product Editing updates stock and details', async ({ page }) => {
    await navigateToTab(page, 'Inventory');

    const searchInput = page.locator('input[placeholder*="Search products" i]');
    await searchInput.fill(productName);
    await page.waitForTimeout(500);

    const productCard = page.locator(`.product-card:has-text("${productName}")`);
    await expect(productCard).toBeVisible();

    // Click Edit button on the product card
    const editBtn = productCard.locator('button:has-text("Edit"), button[title*="Edit" i]');
    await editBtn.click();

    const editHeading = page.getByRole('heading', { name: /Edit Product/i });
    await expect(editHeading).toBeVisible();

    // Update quantity to 25
    const qtyInput = page.getByRole('spinbutton', { name: /Current Quantity/i });
    await qtyInput.fill('25');

    // Submit Update
    const updateBtn = page.locator('button[type="submit"]:has-text("Update Product")');
    await updateBtn.click();

    await expect(editHeading).not.toBeVisible();

    // Verify updated stock
    await searchInput.fill(productName);
    await page.waitForTimeout(500);
    await expect(productCard).toContainText('25');
  });
});
