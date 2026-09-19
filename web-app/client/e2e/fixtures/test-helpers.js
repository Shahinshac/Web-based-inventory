/**
 * Reusable Playwright E2E Helpers for Web-based Inventory ERP
 */
const { expect } = require('@playwright/test');

function getUniqueTimestamp() {
  return Date.now();
}

/**
 * Log in as Admin / Staff
 */
async function loginAdmin(page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // If on customer tab, switch to staff
  const staffBtn = page.locator('button.ultra-segment-btn:has-text("STAFF")');
  if (await staffBtn.isVisible()) {
    await staffBtn.click();
  }

  const usernameInput = page.locator('input[placeholder*="username" i]');
  const passwordInput = page.locator('input[placeholder*="password" i]');

  await usernameInput.fill('admin');
  await passwordInput.fill('admin123');
  await page.locator('button[type="submit"]:has-text("Sign In")').click();

  // Wait for sidebar to be visible
  await expect(page.locator('aside.premium-sidebar')).toBeVisible({ timeout: 15000 });
}

/**
 * Log in to Customer Portal
 */
async function loginCustomerPortal(page, { email, password }) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Switch to Customer tab
  const customerBtn = page.locator('button.ultra-segment-btn:has-text("CUSTOMER")');
  await expect(customerBtn).toBeVisible();
  await customerBtn.click();

  // Select Login subtab if not active
  const loginSubtab = page.locator('button.ultra-customer-tab:has-text("Login")');
  if (await loginSubtab.isVisible()) {
    await loginSubtab.click();
  }

  await page.locator('input[type="email"], input[placeholder*="@"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]:has-text("Sign In")').click();

  // Assert Customer Portal loaded
  await expect(page.locator('.customer-portal, .portal-brand, .brand-name:has-text("26-07")')).toBeVisible({ timeout: 15000 });
}

/**
 * Register on Customer Portal
 */
async function registerCustomerPortal(page, { email, password }) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const customerBtn = page.locator('button.ultra-segment-btn:has-text("CUSTOMER")');
  await customerBtn.click();

  const registerSubtab = page.locator('button.ultra-customer-tab:has-text("Register")');
  await registerSubtab.click();

  await page.locator('input[placeholder*="email" i]').fill(email);
  const passwordInputs = page.locator('input[type="password"]');
  await passwordInputs.nth(0).fill(password);
  await passwordInputs.nth(1).fill(password);

  await page.locator('button[type="submit"]:has-text("Create Account")').click();
}

/**
 * Navigate to Tab in Admin Sidebar
 */
async function navigateToTab(page, tabLabel) {
  const navBtn = page.locator(`button.nav-btn:has-text("${tabLabel}")`);
  await expect(navBtn).toBeVisible();
  await navBtn.click();
  await page.waitForTimeout(500);
}

module.exports = {
  getUniqueTimestamp,
  loginAdmin,
  loginCustomerPortal,
  registerCustomerPortal,
  navigateToTab
};
