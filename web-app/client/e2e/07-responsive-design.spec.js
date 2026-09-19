const { test, expect } = require('@playwright/test');
const { loginAdmin } = require('./fixtures/test-helpers');

const VIEWPORTS = [
  { width: 320, height: 800, label: 'Small Mobile (320x800)' },
  { width: 375, height: 812, label: 'iPhone X / SE (375x812)' },
  { width: 390, height: 844, label: 'iPhone 12/13/14 (390x844)' },
  { width: 412, height: 915, label: 'Pixel / Android (412x915)' },
  { width: 768, height: 1024, label: 'iPad / Tablet Portrait (768x1024)' },
  { width: 1024, height: 768, label: 'Tablet Landscape (1024x768)' },
  { width: 1440, height: 900, label: 'Desktop (1440x900)' }
];

test.describe('07. Responsive Viewports & Layout Usability', () => {
  for (const vp of VIEWPORTS) {
    test(`Login Screen layout & usability at ${vp.label}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // 1. Verify no horizontal body overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth - window.innerWidth;
      });
      expect(overflow).toBeLessThanOrEqual(2);

      // 2. Verify login form elements usable
      const signInBtn = page.locator('button[type="submit"]:has-text("Sign In"), button:has-text("Sign In")').first();
      await expect(signInBtn).toBeVisible();

      const customerSegmentBtn = page.locator('button.ultra-segment-btn:has-text("CUSTOMER")');
      await expect(customerSegmentBtn).toBeVisible();
    });

    test(`ERP Admin Workspace usability at ${vp.label}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await loginAdmin(page);

      // 1. Verify no horizontal overflow in admin workspace
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth - window.innerWidth;
      });
      expect(overflow).toBeLessThanOrEqual(5);

      // 2. Verify critical navigation / mobile drawer exists
      if (vp.width <= 768) {
        // Mobile hamburger or bottom bar exists
        const mobileToggle = page.locator('.mobile-menu-toggle, button.menu-toggle, .bottom-nav, .premium-sidebar').first();
        await expect(mobileToggle).toBeVisible();
      } else {
        // Desktop sidebar visible
        await expect(page.locator('aside.premium-sidebar')).toBeVisible();
      }

      // 3. Verify POS is rendered and usable
      const newSaleNav = page.locator('button:has-text("New Sale"), .sidebar-nav button:has-text("POS")').first();
      if (await newSaleNav.isVisible()) {
        await newSaleNav.click();
        await expect(page.getByRole('heading', { name: /Point of Sale/i }).first()).toBeVisible();
      }
    });
  }
});
