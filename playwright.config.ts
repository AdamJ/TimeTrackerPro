import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for screenshot generation
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
	testDir: "./tests",
	// Only run screenshot tests
	testMatch: "**/screenshots.spec.ts",
	// Run tests in parallel
	fullyParallel: true,
	// Fail the build on CI if you accidentally left test.only in the source code
	forbidOnly: !!process.env.CI,
	// Retry on CI only
	retries: process.env.CI ? 2 : 0,
	// Opt out of parallel tests on CI
	workers: process.env.CI ? 1 : undefined,
	// Reporter to use
	reporter: "list",
	// Shared settings for all the projects below
	use: {
		// Base URL to use in actions like `await page.goto('/')`
		baseURL: "http://localhost:8080",
		// Collect trace when retrying the failed test
		trace: "on-first-retry",
		// Screenshot on failure
		screenshot: "only-on-failure",
	},

	// Configure projects for major browsers (only chromium needed for screenshots)
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],

	// Don't start the dev server automatically
	// Run `npm run dev` manually before taking screenshots
});
