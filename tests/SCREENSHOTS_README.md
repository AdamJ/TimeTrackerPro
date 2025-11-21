# 📸 PWA Screenshot Generator

Automated screenshot generation for TimeTracker Pro PWA using Playwright.

## 🎯 What This Does

This script automatically captures professional screenshots for your PWA in the correct sizes:
- **Desktop:** 1920×1080 (wide format for desktop/laptop displays)
- **Mobile:** 750×1334 (narrow format for mobile devices)

Screenshots are saved to `public/screenshots/` and automatically included in the PWA manifest.

## 🚀 Quick Start

### 1. Install Playwright Browsers (First Time Only)

```bash
npm run screenshots:install
```

This downloads the Chromium browser needed for screenshot capture (~300MB).

### 2. Start Your Dev Server

```bash
npm run dev
```

Keep this terminal running! The script needs the app running at `http://localhost:8080`.

### 3. Capture Screenshots (In New Terminal)

```bash
npm run screenshots
```

Screenshots will be saved to:
- `public/screenshots/desktop-1.png` (1920×1080)
- `public/screenshots/mobile-1.png` (750×1334)
- `public/screenshots/desktop-2-active.png` (optional - with active day)
- `public/screenshots/mobile-2-nav.png` (optional - with nav visible)

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `npm run screenshots` | Capture all screenshots (headless) |
| `npm run screenshots:headed` | Capture with visible browser (debugging) |
| `npm run screenshots:install` | Install Playwright browsers |

## 🎨 Customization

### Modify Screenshot Content

Edit `tests/screenshots.spec.ts` to customize what's captured:

```typescript
// Example: Navigate to specific page before screenshot
await page.goto("http://localhost:8080/archive");

// Example: Click a button to show specific content
await page.click("button:has-text('Start Day')");

// Example: Fill a form
await page.fill("input[name='title']", "Example Task");

// Example: Wait for element to appear
await page.waitForSelector(".task-item");
```

### Add More Screenshots

Add new test cases in `screenshots.spec.ts`:

```typescript
test("capture archive page", async ({ browser }) => {
	const context = await browser.newContext(DESKTOP_CONFIG);
	const page = await context.newPage();

	await page.goto("http://localhost:8080/archive");
	await page.waitForSelector("#root");

	await page.screenshot({
		path: path.join(SCREENSHOTS_DIR, "desktop-archive.png"),
	});

	await context.close();
});
```

### Change Screenshot Sizes

Update the configuration in `screenshots.spec.ts`:

```typescript
// Custom desktop size
const DESKTOP_CONFIG = {
	viewport: { width: 2560, height: 1440 }, // 4K
	deviceScaleFactor: 1,
};

// Custom mobile size
const MOBILE_CONFIG = {
	viewport: { width: 1080, height: 1920 }, // Full HD mobile
	deviceScaleFactor: 2,
};
```

## 🔧 Troubleshooting

### "Connection refused" or "net::ERR_CONNECTION_REFUSED"
**Problem:** Dev server is not running.
**Solution:** Run `npm run dev` in a separate terminal first.

### Screenshots are blank or show loading state
**Problem:** App taking too long to load.
**Solution:** Increase timeout in `screenshots.spec.ts`:
```typescript
await page.waitForSelector("#root", { timeout: 20000 }); // 20 seconds
```

### Want to see what's happening
**Problem:** Headless mode makes it hard to debug.
**Solution:** Use headed mode:
```bash
npm run screenshots:headed
```

### Screenshots include unwanted elements
**Problem:** Test data or UI elements you don't want visible.
**Solution:** Hide elements before screenshot:
```typescript
// Hide specific element
await page.evaluate(() => {
	document.querySelector(".unwanted-element")?.remove();
});

// Or add CSS to hide it
await page.addStyleTag({
	content: ".unwanted-element { display: none !important; }"
});
```

### File size too large
**Problem:** Screenshots are > 1MB.
**Solution:** Use image optimization tools after capture:
```bash
# Install optimizer
npm install -g sharp-cli

# Optimize screenshots
npx sharp -i public/screenshots/desktop-1.png -o public/screenshots/desktop-1.png --webp
```

## 📐 PWA Screenshot Requirements

Your screenshots meet PWA standards:

### Desktop Screenshots (Wide)
- ✅ **Size:** 1920×1080
- ✅ **Aspect Ratio:** 16:9
- ✅ **Form Factor:** wide
- ✅ **Format:** PNG
- ✅ **Max File Size:** < 1MB recommended

### Mobile Screenshots (Narrow)
- ✅ **Size:** 750×1334
- ✅ **Aspect Ratio:** 9:16
- ✅ **Form Factor:** narrow
- ✅ **Format:** PNG
- ✅ **Max File Size:** < 1MB recommended

## 🎯 Best Practices

### ✅ DO:
- Show real data (realistic tasks, projects)
- Capture app in use (active timer, tasks visible)
- Use light mode for better visibility
- Show key features (navigation, main dashboard)
- Keep UI clean (no debug tools visible)

### ❌ DON'T:
- Show empty states or placeholders
- Include sensitive client data
- Capture error messages or warnings
- Show browser chrome or dev tools
- Use very dark themes (harder to see details)

## 🔄 Updating Screenshots

When you update your app's design:

1. Start dev server: `npm run dev`
2. Capture new screenshots: `npm run screenshots`
3. Verify output: Check `public/screenshots/`
4. Commit changes: `git add public/screenshots/ && git commit -m "chore: update PWA screenshots"`

## 📚 Advanced Usage

### Capture Specific User Flow

```typescript
test("capture onboarding flow", async ({ browser }) => {
	const context = await browser.newContext(DESKTOP_CONFIG);
	const page = await context.newPage();

	await page.goto("http://localhost:8080");

	// Step 1: Homepage
	await page.screenshot({ path: "public/screenshots/step-1.png" });

	// Step 2: Start day
	await page.click("button:has-text('Start Day')");
	await page.waitForTimeout(500);
	await page.screenshot({ path: "public/screenshots/step-2.png" });

	// Step 3: Create task
	await page.click("button:has-text('New Task')");
	await page.waitForTimeout(500);
	await page.screenshot({ path: "public/screenshots/step-3.png" });

	await context.close();
});
```

### Mock Data for Screenshots

```typescript
// Inject mock data before screenshot
await page.evaluate(() => {
	localStorage.setItem("mock_data", JSON.stringify({
		tasks: [
			{ id: 1, title: "Design Homepage", duration: 7200 },
			{ id: 2, title: "Code Feature", duration: 5400 }
		]
	}));
});

await page.reload();
```

## 📖 Additional Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [PWA Manifest Spec](https://www.w3.org/TR/appmanifest/)
- [Google PWA Guidelines](https://web.dev/progressive-web-apps/)
- [RealFaviconGenerator](https://realfavicongenerator.net/)

## 💡 Tips

1. **Consistent branding:** Use the same color scheme in all screenshots
2. **Show value:** Demonstrate the app solving a problem
3. **Multiple views:** Capture 2-3 different screens if possible
4. **Test on devices:** View screenshots on actual mobile devices
5. **Update regularly:** Refresh screenshots when UI changes significantly

---

**Need help?** Check the [Playwright documentation](https://playwright.dev) or open an issue in the repository.
