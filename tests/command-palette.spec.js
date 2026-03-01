const { test, expect } = require('@playwright/test');

// Helper: login before each test
async function loginAsAdmin(page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'm.nodes@novaris-consulting.de');
  await page.fill('input[type="password"]', 'Nodes4652.');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/', { timeout: 10000 });
}

test.describe('Command Palette & Keyboard Shortcuts', () => {
  test('should open command palette with Ctrl+K', async ({ page }) => {
    await loginAsAdmin(page);
    await page.keyboard.press('Control+k');
    await expect(page.locator('input[placeholder*="Such"]')).toBeVisible({ timeout: 3000 });
  });

  test('should close command palette with Escape', async ({ page }) => {
    await loginAsAdmin(page);
    await page.keyboard.press('Control+k');
    await expect(page.locator('input[placeholder*="Such"]')).toBeVisible({ timeout: 3000 });
    await page.keyboard.press('Escape');
    await expect(page.locator('input[placeholder*="Such"]')).not.toBeVisible({ timeout: 3000 });
  });

  test('should navigate to pipeline with keyboard shortcut', async ({ page }) => {
    await loginAsAdmin(page);
    // Wait for page to be ready
    await page.waitForTimeout(500);
    await page.keyboard.press('g');
    await page.keyboard.press('p');
    await expect(page).toHaveURL('/pipeline', { timeout: 5000 });
  });

  test('should show shortcuts help with ?', async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForTimeout(500);
    await page.keyboard.press('?');
    await expect(page.locator('text=Tastenkürzel')).toBeVisible({ timeout: 3000 });
  });
});
