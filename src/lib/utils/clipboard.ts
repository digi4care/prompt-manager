/**
 * Clipboard utility functions
 */

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<void> {
	if (typeof navigator === 'undefined' || !navigator.clipboard) {
		// Fallback for older browsers
		return fallbackCopyToClipboard(text);
	}

	try {
		await navigator.clipboard.writeText(text);
	} catch (err) {
		console.error('Failed to copy using clipboard API:', err);
		// Try fallback
		return fallbackCopyToClipboard(text);
	}
}

/**
 * Fallback copy method using textarea
 */
function fallbackCopyToClipboard(text: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const textarea = document.createElement('textarea');
		textarea.value = text;
		textarea.style.position = 'fixed';
		textarea.style.left = '-999999px';
		document.body.appendChild(textarea);
		textarea.focus();
		textarea.select();

		try {
			const successful = document.execCommand('copy');
			document.body.removeChild(textarea);
			if (successful) {
				resolve();
			} else {
				reject(new Error('Failed to copy'));
			}
		} catch (err) {
			document.body.removeChild(textarea);
			reject(err);
		}
	});
}
