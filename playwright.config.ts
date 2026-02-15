import { defineConfig, devices } from '@playwright/test';

const webServerMode = process.env.E2E_WEB_SERVER ?? 'dev';
const webServerCommand =
	webServerMode === 'preview-node'
		? 'node ./node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 45678'
		: webServerMode === 'preview'
			? 'bun run preview --host 127.0.0.1 --port 45678'
			: 'bun run dev';

export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.E2E_WORKERS
		? Number.parseInt(process.env.E2E_WORKERS, 10)
		: process.env.CI
			? 1
			: undefined,
	reporter: 'line',
	outputDir: process.env.E2E_OUTPUT_DIR || '/tmp/playwright-results',
	use: {
		baseURL: 'http://127.0.0.1:45678',
		trace: 'on-first-retry'
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		},
		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] }
		}
	],
	webServer: {
		command: webServerCommand,
		url: 'http://127.0.0.1:45678',
		reuseExistingServer: true,
		timeout: 120000
	}
});
