/**
 * screenshot-all.mjs — Takes screenshots of all CRM pages (logs in first)
 * Usage: node screenshot-all.mjs
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:5173';
const outDir = path.join(__dirname, 'temporary screenshots');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Find next index
const existing = fs.readdirSync(outDir).filter(f => f.startsWith('screenshot-') && f.endsWith('.png'));
const indices = existing.map(f => parseInt(f.replace('screenshot-', '').split(/[-\.]/)[0])).filter(n => !isNaN(n));
let nextIdx = indices.length > 0 ? Math.max(...indices) + 1 : 1;

// Find Chrome
const chromePaths = [
  'C:/Users/nateh/.cache/puppeteer/chrome',
  `C:/Users/${process.env.USERNAME}/.cache/puppeteer/chrome`,
].filter(Boolean);

let executablePath;
for (const p of chromePaths) {
  try {
    const entries = fs.readdirSync(p);
    for (const entry of entries) {
      const candidate = path.join(p, entry, 'chrome-win64', 'chrome.exe');
      if (fs.existsSync(candidate)) { executablePath = candidate; break; }
    }
    if (executablePath) break;
  } catch {}
}

async function screenshot(page, label) {
  const filename = `screenshot-${nextIdx}-${label}.png`;
  const outPath = path.join(outDir, filename);
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: outPath, fullPage: true });
  console.log(`  📸  ${filename}`);
  nextIdx++;
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    ...(executablePath ? { executablePath } : {}),
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 });

    // 1. Login page
    await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 30000 });
    await screenshot(page, 'login');

    // 2. Log in
    await page.type('input[type="email"]', 'admin@crm.de');
    await page.type('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

    // 3. Pipeline page (default after login)
    await screenshot(page, 'pipeline');

    // 4. Company list page
    await page.goto(`${BASE}/companies`, { waitUntil: 'networkidle0', timeout: 15000 });
    await screenshot(page, 'company-list');

    // 5. Try to click on a company if one exists
    const companyRow = await page.$('table tbody tr');
    if (companyRow) {
      await companyRow.click();
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 1500));
      await screenshot(page, 'company-detail');
    } else {
      console.log('  ℹ️  No companies to screenshot detail page');
    }

    console.log('\n  ✅  All screenshots done!\n');
  } catch (err) {
    console.error('\n  ❌  Error:', err.message, '\n');
  } finally {
    await browser.close();
  }
})();
