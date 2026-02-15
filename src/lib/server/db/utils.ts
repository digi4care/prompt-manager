export function parseJsonField<T>(json: string | null): T | null {
	if (!json) return null;
	try {
		return JSON.parse(json) as T;
	} catch {
		return null;
	}
}

export function stringifyJsonField<T>(data: T): string {
	return JSON.stringify(data);
}
