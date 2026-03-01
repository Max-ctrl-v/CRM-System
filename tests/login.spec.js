const { test, expect } = require('@playwright/test');

test.describe('Login Flow', () => {
  test('should show login page with form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Willkommen zurück');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Anmelden');
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'invalid@test.de');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('[class*="red"]')).toBeVisible({ timeout: 5000 });
  });

  test('should redirect to dashboard after successful login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'm.nodes@novaris-consulting.de');
    await page.fill('input[type="password"]', 'Nodes4652.');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 10000 });
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('should display user name after login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'm.nodes@novaris-consulting.de');
    await page.fill('input[type="password"]', 'Nodes4652.');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 10000 });
    await expect(page.locator('header')).toContainText('Max Nodes');
  });
});
