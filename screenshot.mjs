/**
 * screenshot.mjs — Puppeteer screenshot utility
 * Usage:
 *   node screenshot.mjs http://localhost:3000
 *   node screenshot.mjs http://localhost:3000 label
 *
 * Saves to: ./temporary screenshots/screenshot-N[-label].png
 * Auto-increments N so files are never overwritten.
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url   = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';

// Ensure output directory exists
const outDir = path.join(__dirname, 'temporary screenshots');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Find next available index
const existing = fs.readdirSync(outDir).filter(f => f.startsWith('screenshot-') && f.endsWith('.png'));
const indices  = existing.map(f => parseInt(f.replace('screenshot-', '').split(/[-\.]/)[0])).filter(n => !isNaN(n));
const nextIdx  = indices.length > 0 ? Math.max(...indices) + 1 : 1;
const filename = label ? `screenshot-${nextIdx}-${label}.png` : `screenshot-${nextIdx}.png`;
const outPath  = path.join(outDir, filename);

// Puppeteer paths — tries common locations, falls back to default
const chromePaths = [
  'C:/Users/nateh/.cache/puppeteer/chrome',
  `C:/Users/${process.env.USERNAME}/.cache/puppeteer/chrome`,
  process.env.PUPPETEER_EXECUTABLE_PATH,
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

const launchOpts = {
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  ...(executablePath ? { executablePath } : {}),
};

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch(launchOpts);
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 });
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    // Let animations settle
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: outPath, fullPage: true });
    console.log(`\n  📸  Saved: ${outPath}\n`);
  } catch (err) {
    console.error('\n  ❌  Screenshot failed:', err.message, '\n');
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
