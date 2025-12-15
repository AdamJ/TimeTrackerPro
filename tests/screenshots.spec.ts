import { test, devices } from '@playwright/test';
import path from 'path';

/**
 * PWA Screenshot Generator
 *
 * This script captures screenshots for the PWA manifest in the correct sizes:
 * - Desktop: 1920×1080 (wide format)
 * - Mobile: 750×1334 (narrow format)
 *
 * Usage:
 *   npm run screenshots
 *
 * Prerequisites:
 *   - App must be running on http://localhost:8080
 *   - Run `npm run dev` in a separate terminal first
 */

const BASE_URL = 'http://localhost:8080';
const ARCHIVE_URL = 'http://localhost:8080/archive';
const SETTINGS_URL = 'http://localhost:8080/settings';
const SCREENSHOTS_DIR = path.join(process.cwd(), 'public', 'screenshots');

// Desktop screenshot configuration
const DESKTOP_CONFIG = {
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1
};

// Mobile screenshot configuration (iPhone 6/7/8 Plus equivalent)
const MOBILE_CONFIG = {
  viewport: { width: 750, height: 1334 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true
};

test.describe('PWA Screenshots', () => {
  test('capture desktop screenshot', async ({ browser }) => {
    const context = await browser.newContext(DESKTOP_CONFIG);
    const page = await context.newPage();

    try {
      // Navigate to the app
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });

      // Wait for app to be fully loaded
      await page.waitForSelector('#root', { timeout: 10000 });

      // Optional: Wait for any animations to complete
      await page.waitForTimeout(1000);

      // Take the screenshot
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'desktop-1.png'),
        fullPage: false // Capture viewport only
      });

      console.log(
        '✅ Desktop screenshot saved: public/screenshots/desktop-1.png'
      );
    } catch (error) {
      console.error('❌ Failed to capture desktop screenshot:', error);
      throw error;
    } finally {
      await context.close();
    }
  });

  test('capture mobile screenshot', async ({ browser }) => {
    const context = await browser.newContext(MOBILE_CONFIG);
    const page = await context.newPage();

    try {
      // Navigate to the app
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });

      // Wait for app to be fully loaded
      await page.waitForSelector('#root', { timeout: 10000 });

      // Optional: Wait for mobile nav to render
      await page.waitForTimeout(1000);

      // Take the screenshot
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'mobile-1.png'),
        fullPage: false // Capture viewport only
      });

      console.log(
        '✅ Mobile screenshot saved: public/screenshots/mobile-1.png'
      );
    } catch (error) {
      console.error('❌ Failed to capture mobile screenshot:', error);
      throw error;
    } finally {
      await context.close();
    }
  });

  test('capture desktop screenshot with active day', async ({ browser }) => {
    const context = await browser.newContext(DESKTOP_CONFIG);
    const page = await context.newPage();

    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('#root', { timeout: 10000 });

      // Try to start a day if possible (adjust selectors based on your app)
      try {
        const startButton = page
          .locator("button:has-text('Start Day')")
          .first();
        if (await startButton.isVisible({ timeout: 2000 })) {
          await startButton.click();
          await page.waitForTimeout(1500);
        }
      } catch (e) {
        console.log('Note: Could not start day (may already be started)');
      }

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'desktop-2-active.png'),
        fullPage: false
      });

      console.log(
        '✅ Desktop active screenshot saved: public/screenshots/desktop-2-active.png'
      );
    } catch (error) {
      console.error('❌ Failed to capture desktop active screenshot:', error);
      // Don't throw - this is optional
    } finally {
      await context.close();
    }
  });

  test('capture desktop screenshot with archives', async ({ browser }) => {
    const context = await browser.newContext(DESKTOP_CONFIG);
    const page = await context.newPage();

    try {
      await page.goto(ARCHIVE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('#root', { timeout: 10000 });

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'desktop-1-archive.png'),
        fullPage: false
      });

      console.log(
        '✅ Desktop archive screenshot saved: public/screenshots/desktop-1-archive.png'
      );
    } catch (error) {
      console.error('❌ Failed to capture desktop archive screenshot:', error);
      // Don't throw - this is optional
    } finally {
      await context.close();
    }
  });

  test('capture mobile screenshot with bottom nav', async ({ browser }) => {
    const context = await browser.newContext(MOBILE_CONFIG);
    const page = await context.newPage();

    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('#root', { timeout: 10000 });

      // Wait for mobile nav to be visible
      await page.waitForTimeout(1500);

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'mobile-2-nav.png'),
        fullPage: false
      });

      console.log(
        '✅ Mobile nav screenshot saved: public/screenshots/mobile-2-nav.png'
      );
    } catch (error) {
      console.error('❌ Failed to capture mobile nav screenshot:', error);
      // Don't throw - this is optional
    } finally {
      await context.close();
    }
  });
});
