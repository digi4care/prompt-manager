/**
 * Retry utility with exponential backoff for transient failures.
 *
 * Usage:
 *   const result = await withRetry(() => callOpenCode(), { maxRetries: 2 });
 */
export interface RetryOptions {
	maxRetries?: number;
	baseDelayMs?: number;
	shouldRetry?: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
	maxRetries: 2,
	baseDelayMs: 250,
	shouldRetry: isTransientError
};

/**
 * Determine if an error is transient (worth retrying).
 * Non-transient errors include validation errors, auth errors, and 4xx client errors.
 */
export function isTransientError(error: unknown): boolean {
	if (error instanceof Error) {
		// Validation errors (model not allowed, invalid input) — never retry
		if (error.name === 'OpenCodeValidationError') return false;

		const msg = error.message?.toLowerCase() ?? '';

		// Network/timeout errors — always retry
		if (
			msg.includes('timeout') ||
			msg.includes('econnreset') ||
			msg.includes('econnrefused') ||
			msg.includes('fetch failed') ||
			msg.includes('network') ||
			msg.includes('abort')
		) {
			return true;
		}

		// Client errors (4xx) — don't retry
		if (
			msg.includes('400') ||
			msg.includes('401') ||
			msg.includes('403') ||
			msg.includes('404') ||
			msg.includes('429')
		) {
			return false;
		}
	}

	// Default: retry unknown errors (safer for transient network blips)
	return true;
}

export async function withRetry<T>(
	fn: () => Promise<T>,
	opts: RetryOptions = {}
): Promise<T> {
	const { maxRetries, baseDelayMs, shouldRetry } = { ...DEFAULT_OPTIONS, ...opts };

	let lastError: unknown;
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error: unknown) {
			lastError = error;
			if (attempt >= maxRetries || !shouldRetry(error)) {
				throw error;
			}
			const backoff = Math.pow(2, attempt) * baseDelayMs;
			await new Promise((r) => setTimeout(r, backoff));
		}
	}

	throw lastError;
}
