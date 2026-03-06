import { chromium } from 'playwright';

async function takeSnapshot() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: '/home/digi4care/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome'
	});
	const context = await browser.newContext();
	const page = await context.newPage();

	await page.goto('http://localhost:45678/login');

	// Wait for page to be fully loaded
	await page.waitForLoadState('networkidle');

	// Take screenshot
	await page.screenshot({ path: '/tmp/login-page.png', fullPage: true });

	// Get HTML content for analysis
	const html = await page.content();

	// Get page title
	const title = await page.title();

	// Get all form elements
	const forms = await page.locator('form').count();
	const inputs = await page.locator('input').count();
	const buttons = await page.locator('button').count();
	const links = await page.locator('a').count();

	console.log('=== Page Analysis ===');
	console.log('Title:', title);
	console.log('Forms:', forms);
	console.log('Inputs:', inputs);
	console.log('Buttons:', buttons);
	console.log('Links:', links);

	// Get visible text content
	const bodyText = await page.locator('body').innerText();
	console.log('\n=== Visible Text ===');
	console.log(bodyText);

	// Get all input fields with their types and names
	console.log('\n=== Input Fields ===');
	const inputFields = await page.locator('input').all();
	for (const input of inputFields) {
		const type = await input.getAttribute('type');
		const name = await input.getAttribute('name');
		const id = await input.getAttribute('id');
		const placeholder = await input.getAttribute('placeholder');
		console.log(`- type: ${type}, name: ${name}, id: ${id}, placeholder: ${placeholder}`);
	}

	// Get all button text
	console.log('\n=== Buttons ===');
	const buttonElements = await page.locator('button').all();
	for (const button of buttonElements) {
		const text = await button.innerText();
		const type = await button.getAttribute('type');
		console.log(`- text: "${text}", type: ${type}`);
	}

	// Get links
	console.log('\n=== Links ===');
	const linkElements = await page.locator('a').all();
	for (const link of linkElements) {
		const text = await link.innerText();
		const href = await link.getAttribute('href');
		console.log(`- text: "${text}", href: ${href}`);
	}

	await browser.close();

	console.log('\n=== Screenshot saved to /tmp/login-page.png ===');
}

takeSnapshot().catch(console.error);
