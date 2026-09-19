const { test, expect } = require('@playwright/test');
const { loginAdmin, navigateToTab, getUniqueTimestamp } = require('./fixtures/test-helpers');

test.describe('02. Customer Management & CRM', () => {
  const timestamp = getUniqueTimestamp();
  const customerName = `PW Customer ${timestamp}`;
  const phone = `9876${String(timestamp).slice(-6)}`;
  const email = `pw_cust_${timestamp}@example.com`;

  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test('Customer Creation with fresh contact data', async ({ page }) => {
    await navigateToTab(page, 'CRM / Customers');

    const addCustBtn = page.locator('button:has-text("Add Customer")');
    await expect(addCustBtn).toBeVisible();
    await addCustBtn.click();

    const modalHeading = page.getByRole('heading', { name: /Add New Customer/i });
    await expect(modalHeading).toBeVisible();

    // Fill customer details
    await page.getByRole('textbox', { name: /Customer Name/i }).fill(customerName);
    await page.getByRole('textbox', { name: /Phone Number/i }).fill(phone);
    await page.getByRole('textbox', { name: /Email Address/i }).fill(email);
    
    const placeInput = page.getByRole('textbox', { name: 'Place/City' });
    if (await placeInput.isVisible()) {
      await placeInput.fill('Kochi Central');
    }

    // Submit
    const submitBtn = page.locator('button[type="submit"]:has-text("Add Customer")');
    await submitBtn.click();

    // Modal closes
    await expect(modalHeading).not.toBeVisible();

    // Verify customer appears in CRM list
    const searchInput = page.locator('input[placeholder*="Search by name" i], input[placeholder*="Search" i]').first();
    await searchInput.fill(customerName);
    await page.waitForTimeout(500);

    const customerCard = page.locator(`.customer-card:has-text("${customerName}")`);
    await expect(customerCard).toBeVisible();
    await expect(customerCard).toContainText(phone);
  });

  test('Customer Editing updates contact details', async ({ page }) => {
    await navigateToTab(page, 'CRM / Customers');

    const searchInput = page.locator('input[placeholder*="Search by name" i], input[placeholder*="Search" i]').first();
    await searchInput.fill(customerName);
    await page.waitForTimeout(500);

    const customerCard = page.locator(`.customer-card:has-text("${customerName}")`);
    await expect(customerCard).toBeVisible();

    // Click Edit
    await customerCard.locator('button:has-text("Edit")').click();

    const editHeading = page.getByRole('heading', { name: /Edit Customer/i });
    await expect(editHeading).toBeVisible();

    // Update place
    const placeInput = page.getByRole('textbox', { name: 'Place/City' });
    if (await placeInput.isVisible()) {
      await placeInput.fill('Ernakulam North');
    }

    // Submit Update
    const updateBtn = page.locator('button[type="submit"]:has-text("Update Customer")');
    await updateBtn.click();

    await expect(editHeading).not.toBeVisible();

    // Verify updated place
    await searchInput.fill(customerName);
    await page.waitForTimeout(500);
    await expect(customerCard).toContainText('Ernakulam North');
  });

  test('Customer History view displays purchase and warranty overview', async ({ page }) => {
    await navigateToTab(page, 'CRM / Customers');

    const searchInput = page.locator('input[placeholder*="Search by name" i], input[placeholder*="Search" i]').first();
    await searchInput.fill(customerName);
    await page.waitForTimeout(500);

    const customerCard = page.locator(`.customer-card:has-text("${customerName}")`);
    await expect(customerCard).toBeVisible();

    // Click History
    await customerCard.locator('button:has-text("History")').click();

    // History modal
    const historyModal = page.locator('.modal-content:has-text("Customer History"), .modal-content:has-text("Total Spent")');
    await expect(historyModal).toBeVisible();
    await expect(historyModal).toContainText('Total Spent');
    await expect(historyModal).toContainText('Purchase Count');

    // Close modal
    const closeBtn = historyModal.locator('button:has-text("Close"), button.modal-close, button:has-text("×")').first();
    await closeBtn.click();
    await expect(historyModal).not.toBeVisible();
  });
});
