const MODEL_CATALOG_CACHE_KEY = 'ai-settings:model-catalog:v1';

interface ModelCatalogCacheEntry {
	payload: unknown;
	savedAt: number;
}

export function getCachedModelCatalog(maxAgeMs = 30 * 60 * 1000): unknown | null {
	if (typeof window === 'undefined') {
		return null;
	}

	try {
		const raw = window.sessionStorage.getItem(MODEL_CATALOG_CACHE_KEY);
		if (!raw) {
			return null;
		}

		const parsed = JSON.parse(raw) as ModelCatalogCacheEntry;
		if (!parsed || typeof parsed !== 'object') {
			return null;
		}

		if (typeof parsed.savedAt !== 'number' || !('payload' in parsed)) {
			return null;
		}

		if (Date.now() - parsed.savedAt > maxAgeMs) {
			window.sessionStorage.removeItem(MODEL_CATALOG_CACHE_KEY);
			return null;
		}

		return parsed.payload;
	} catch {
		return null;
	}
}

export function setCachedModelCatalog(payload: unknown): void {
	if (typeof window === 'undefined') {
		return;
	}

	try {
		const value: ModelCatalogCacheEntry = {
			payload,
			savedAt: Date.now()
		};
		window.sessionStorage.setItem(MODEL_CATALOG_CACHE_KEY, JSON.stringify(value));
	} catch {
		// Ignore cache write failures (quota/private mode)
	}
}

export function clearCachedModelCatalog(): void {
	if (typeof window === 'undefined') {
		return;
	}
	window.sessionStorage.removeItem(MODEL_CATALOG_CACHE_KEY);
}
