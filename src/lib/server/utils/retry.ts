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
	shouldRetry: () => true
};

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
