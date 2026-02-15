// Date formatting utilities

// Simple format mappings (PHP style → result)
function formatWithFormat(date: Date, format: string): string {
	const day = String(date.getDate()).padStart(2, '0');
	const monthNum = String(date.getMonth() + 1).padStart(2, '0');
	const year = date.getFullYear();
	const monthShort = date.toLocaleDateString('en-US', { month: 'short' });
	const monthLong = date.toLocaleDateString('en-US', { month: 'long' });

	// Simple replacement-based formatter
	let result = format;
	result = result.replace('F', monthLong); // January
	result = result.replace('M', monthShort); // Jan
	result = result.replace('j', String(date.getDate())); // 1
	result = result.replace('d', day); // 01
	result = result.replace('Y', String(year)); // 2025
	result = result.replace('y', String(year).slice(-2)); // 25

	return result;
}

// Cached format setting
let cachedFormat: string | null = null;
let isLoading = false;
let pendingPromises: ((value: string) => void)[] = [];

/**
 * Get the current date format from admin settings
 */
export async function getDateFormat(): Promise<string> {
	if (cachedFormat) return cachedFormat;

	// If already loading, wait for it
	if (isLoading) {
		return new Promise((resolve) => pendingPromises.push(resolve));
	}

	isLoading = true;
	return fetch('/api/admin/settings')
		.then((res) => res.json())
		.then((data) => {
			const format = data.data.display?.date_format || 'M j, Y';
			cachedFormat = format;
			return format;
		})
		.catch(() => 'M j, Y')
		.finally(() => {
			isLoading = false;
			pendingPromises.forEach((resolve) => {
				resolve(cachedFormat || 'M j, Y');
			});
			pendingPromises = [];
		});
}

/**
 * Format a date using the configured admin setting (async)
 */
export async function formatDateSetting(
	date: Date | string | number | null | undefined
): Promise<string> {
	if (!date) return 'Unknown';
	const d = new Date(date);
	if (isNaN(d.getTime())) return 'Unknown';
	const format = await getDateFormat();
	return formatWithFormat(d, format);
}

/**
 * Format a date using a specific format string (sync)
 */
export function formatDateString(date: Date, format: string): string {
	if (isNaN(date.getTime())) return 'Invalid Date';
	return formatWithFormat(date, format);
}

/**
 * Format using current cached/default setting (sync)
 */
export function formatDateSync(date: Date | string | number | null | undefined): string {
	if (!date) return 'Unknown';
	const d = new Date(date);
	if (isNaN(d.getTime())) return 'Unknown';
	return formatWithFormat(d, cachedFormat || 'M j, Y');
}

/**
 * Set the format directly (for store sync)
 */
export function setDateFormat(format: string): void {
	cachedFormat = format;
}

/**
 * Clear cached format
 */
export function clearDateFormatCache(): void {
	cachedFormat = null;
}
