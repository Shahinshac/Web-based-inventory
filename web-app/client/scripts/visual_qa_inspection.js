const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'screenshots_qa');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function runVisualQA() {
  console.log('🚀 Starting Comprehensive Live Browser Visual QA Pass...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const issues = [];

  // Helper to check horizontal overflow
  async function checkHorizontalOverflow(screenName) {
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth ||
             document.body.scrollWidth > window.innerWidth;
    });
    if (hasOverflow) {
      issues.push(`[Overflow] Horizontal scrollbar detected on ${screenName}`);
      console.warn(`⚠️ Horizontal overflow on ${screenName}`);
    } else {
      console.log(`✅ No overflow on ${screenName}`);
    }
  }

  try {
    // 1. Customer Login (Desktop 1440x900)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await checkHorizontalOverflow('Customer Login (1440px)');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '01_customer_login_1440.png') });

    // Verify no staff or admin buttons on customer login
    const staffVisible = await page.locator('button:has-text("Enterprise Administration"), button:has-text("Staff Sign In")').isVisible().catch(() => false);
    if (staffVisible) {
      issues.push('Staff elements visible on Customer Login page');
    }

    // 2. Customer Login (Mobile 375x812)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(300);
    await checkHorizontalOverflow('Customer Login (375px)');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '01_customer_login_375.png') });

    // 3. Staff Login (Desktop 1440x900)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000/staff');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await checkHorizontalOverflow('Staff Login (1440px)');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '02_staff_login_1440.png') });

    // 4. Staff Login (Mobile 375x812)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(300);
    await checkHorizontalOverflow('Staff Login (375px)');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '02_staff_login_375.png') });

    // 5. Perform Staff Login
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('input[placeholder*="username" i]').fill('admin');
    await page.locator('input[placeholder*="password" i]').fill('admin123');
    await page.locator('button[type="submit"]:has-text("Sign In")').click();
    await page.waitForSelector('aside.premium-sidebar', { timeout: 15000 });
    await page.waitForTimeout(1000);

    // 6. Staff Dashboard (Desktop 1440px)
    await checkHorizontalOverflow('Dashboard (1440px)');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '03_dashboard_1440.png') });

    // 7. Dashboard Responsive (1024px, 768px, 375px, 320px)
    for (const width of [1024, 768, 390, 375, 320]) {
      await page.setViewportSize({ width, height: 800 });
      await page.waitForTimeout(300);
      await checkHorizontalOverflow(`Dashboard (${width}px)`);
      await page.screenshot({ path: path.join(OUTPUT_DIR, `03_dashboard_${width}.png`) });
    }

    // Reset to Desktop
    await page.setViewportSize({ width: 1440, height: 900 });

    // 8. Products / Inventory Screen
    const productsBtn = page.locator('button.nav-btn:has-text("Inventory")').first();
    await productsBtn.click();
    await page.waitForTimeout(800);
    await checkHorizontalOverflow('Products (1440px)');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '04_products_1440.png') });

    // 9. Add Product Modal
    const addProductBtn = page.locator('button:has-text("Add Product")').first();
    if (await addProductBtn.isVisible()) {
      await addProductBtn.click();
      await page.waitForTimeout(500);
      await checkHorizontalOverflow('Add Product Modal (1440px)');
      await page.screenshot({ path: path.join(OUTPUT_DIR, '04_add_product_modal.png') });
      const closeBtn = page.locator('.modal-close, button:has-text("Cancel"), button[aria-label="Close"]').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(300);
      }
    }

    // 10. Products Responsive (375px)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(400);
    await checkHorizontalOverflow('Products (375px)');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '04_products_375.png') });
    await page.setViewportSize({ width: 1440, height: 900 });

    // 11. POS Screen
    const posBtn = page.locator('button.nav-btn:has-text("New Sale")').first();
    await posBtn.click();
    await page.waitForTimeout(800);
    await checkHorizontalOverflow('POS (1440px)');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '05_pos_1440.png') });

    // POS Responsive (375px)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(400);
    await checkHorizontalOverflow('POS (375px)');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '05_pos_375.png') });
    await page.setViewportSize({ width: 1440, height: 900 });

    // 12. Customers Screen
    const customersBtn = page.locator('button.nav-btn:has-text("Customers")').first();
    await customersBtn.click();
    await page.waitForTimeout(800);
    await checkHorizontalOverflow('Customers (1440px)');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '06_customers_1440.png') });

    // 13. EMI Screen
    const emiBtn = page.locator('button.nav-btn:has-text("EMI Dashboard")').first();
    if (await emiBtn.isVisible()) {
      await emiBtn.click();
      await page.waitForTimeout(800);
      await checkHorizontalOverflow('EMI (1440px)');
      await page.screenshot({ path: path.join(OUTPUT_DIR, '07_emi_1440.png') });
    }

    // 14. Billing / Invoices Screen
    const billingBtn = page.locator('button.nav-btn:has-text("Billing History")').first();
    await billingBtn.click();
    await page.waitForTimeout(800);
    await checkHorizontalOverflow('Invoices (1440px)');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '08_invoices_1440.png') });

    // 15. Reports Screen
    const reportsBtn = page.locator('button.nav-btn:has-text("Reports")').first();
    if (await reportsBtn.isVisible()) {
      await reportsBtn.click();
      await page.waitForTimeout(800);
      await checkHorizontalOverflow('Reports (1440px)');
      await page.screenshot({ path: path.join(OUTPUT_DIR, '09_reports_1440.png') });
    }

    // 16. Customer Portal (Logout and Login as Customer)
    const logoutBtn = page.locator('button.sidebar-logout').first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await page.waitForTimeout(500);
    }
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('input[type="email"], input[placeholder*="@"]').fill('rajesh_1789959236@example.com');
    await page.locator('input[type="password"]').fill('TestPass123!');
    const signInBtn = page.locator('button[type="submit"]:has-text("Sign In")');
    if (await signInBtn.isVisible()) {
      await signInBtn.click();
      await page.waitForTimeout(1000);
      await checkHorizontalOverflow('Customer Portal (1440px)');
      await page.screenshot({ path: path.join(OUTPUT_DIR, '10_customer_portal_1440.png') });
    }

    console.log('\n==========================================');
    console.log('VISUAL QA INSPECTION SUMMARY:');
    console.log(`Total issues detected: ${issues.length}`);
    issues.forEach(iss => console.log(' - ' + iss));
    console.log(`Screenshots saved to: ${OUTPUT_DIR}`);
    console.log('==========================================\n');

  } catch (err) {
    console.error('Error during visual QA:', err);
  } finally {
    await browser.close();
  }
}

runVisualQA();
