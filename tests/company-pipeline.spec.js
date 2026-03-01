const { test, expect } = require('@playwright/test');

// Helper: login before each test
async function loginAsAdmin(page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'm.nodes@novaris-consulting.de');
  await page.fill('input[type="password"]', 'Nodes4652.');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/', { timeout: 10000 });
}

test.describe('Company & Pipeline', () => {
  test('should navigate to pipeline and see columns', async ({ page }) => {
    await loginAsAdmin(page);
    await page.click('text=Pipeline');
    await expect(page).toHaveURL('/pipeline');
    await expect(page.locator('text=Identifiziert')).toBeVisible();
    await expect(page.locator('text=Kontaktiert')).toBeVisible();
    await expect(page.locator('text=Verhandlung')).toBeVisible();
  });

  test('should navigate to Alle Firmen and see company list', async ({ page }) => {
    await loginAsAdmin(page);
    await page.click('text=Alle Firmen');
    await expect(page).toHaveURL('/companies');
    await expect(page.locator('h2')).toContainText('Alle Firmen');
    await expect(page.locator('table')).toBeVisible();
  });

  test('should search for companies in the list', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/companies');
    await expect(page.locator('table')).toBeVisible();
    const searchInput = page.locator('input[placeholder*="Name"]');
    await searchInput.fill('test_nonexistent_query_xyz');
    await expect(page.locator('text=Keine Ergebnisse')).toBeVisible();
  });

  test('should open company detail page', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/companies');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();
    await page.waitForURL('**/company/**', { timeout: 5000 });
    expect(page.url()).toContain('/company/');
  });
});
