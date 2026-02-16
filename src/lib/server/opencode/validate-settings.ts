import type {
	LocalPortRange,
	OpenCodeConnectionSettings,
	OpenCodeLocalSettings,
	OpenCodeRemoteSettings
} from './types';

export const DEFAULT_LOCAL_HOSTNAME = '127.0.0.1';
export const DEFAULT_LOCAL_PORT_RANGE: LocalPortRange = { min: 10000, max: 65535 };

export class OpenCodeSettingsValidationError extends Error {
	errors: string[];

	constructor(errors: string[]) {
		super(`Invalid OpenCode settings: ${errors.join('; ')}`);
		this.name = 'OpenCodeSettingsValidationError';
		this.errors = errors;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function normalizePortRange(value: unknown, errors: string[]): LocalPortRange {
	if (!isRecord(value)) {
		return DEFAULT_LOCAL_PORT_RANGE;
	}

	const minRaw = value.min;
	const maxRaw = value.max;

	if (!Number.isInteger(minRaw) || !Number.isInteger(maxRaw)) {
		errors.push('local.portRange.min and local.portRange.max must be integers');
		return DEFAULT_LOCAL_PORT_RANGE;
	}

	const min = Number(minRaw);
	const max = Number(maxRaw);

	if (min < 10000 || max > 65535) {
		errors.push('local.portRange must stay within 10000..65535');
	}

	if (min > max) {
		errors.push('local.portRange.min must be <= local.portRange.max');
	}

	return { min, max };
}

function normalizeLocalSettings(value: unknown, errors: string[]): OpenCodeLocalSettings {
	if (value === undefined) {
		return {
			hostname: DEFAULT_LOCAL_HOSTNAME,
			portRange: DEFAULT_LOCAL_PORT_RANGE
		};
	}

	if (!isRecord(value)) {
		errors.push('local settings must be an object');
		return {
			hostname: DEFAULT_LOCAL_HOSTNAME,
			portRange: DEFAULT_LOCAL_PORT_RANGE
		};
	}

	let hostname = DEFAULT_LOCAL_HOSTNAME;
	if (value.hostname !== undefined) {
		if (typeof value.hostname !== 'string' || value.hostname.trim().length === 0) {
			errors.push('local.hostname must be a non-empty string when provided');
		} else {
			hostname = value.hostname.trim();
		}
	}

	const portRange = normalizePortRange(value.portRange, errors);

	return {
		hostname,
		portRange
	};
}

function normalizeRemoteSettings(value: unknown, errors: string[]): OpenCodeRemoteSettings {
	if (!isRecord(value)) {
		errors.push('remote settings must be an object when mode is remote');
		return {};
	}

	const remote: OpenCodeRemoteSettings = {};

	if (value.protocol !== undefined) {
		if (value.protocol !== 'http' && value.protocol !== 'https') {
			errors.push('remote.protocol must be "http" or "https"');
		} else {
			remote.protocol = value.protocol;
		}
	}

	if (value.basePath !== undefined) {
		if (typeof value.basePath !== 'string') {
			errors.push('remote.basePath must be a string when provided');
		} else {
			remote.basePath = value.basePath.trim();
		}
	}

	if (value.baseUrl !== undefined) {
		if (typeof value.baseUrl !== 'string' || value.baseUrl.trim().length === 0) {
			errors.push('remote.baseUrl must be a non-empty string when provided');
		} else {
			try {
				const parsed = new URL(value.baseUrl.trim());
				if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
					errors.push('remote.baseUrl must use http or https');
				}
				remote.baseUrl = value.baseUrl.trim();
			} catch {
				errors.push('remote.baseUrl must be a valid URL');
			}
		}
	}

	if (value.host !== undefined) {
		if (typeof value.host !== 'string' || value.host.trim().length === 0) {
			errors.push('remote.host must be a non-empty string');
		} else {
			remote.host = value.host.trim();
		}
	}

	if (value.port !== undefined) {
		if (!Number.isInteger(value.port)) {
			errors.push('remote.port must be an integer');
		} else {
			const port = Number(value.port);
			if (port < 1 || port > 65535) {
				errors.push('remote.port must be between 1 and 65535');
			} else {
				remote.port = port;
			}
		}
	}

	if (remote.baseUrl === undefined) {
		if (!remote.host) {
			errors.push('remote.host is required when remote.baseUrl is not set');
		}
		if (!remote.port) {
			errors.push('remote.port is required when remote.baseUrl is not set');
		}
	}

	if (value.username !== undefined) {
		if (typeof value.username !== 'string') {
			errors.push('remote.username must be a string when provided');
		} else {
			remote.username = value.username.trim();
		}
	}

	if (value.password !== undefined) {
		if (typeof value.password !== 'string') {
			errors.push('remote.password must be a string when provided');
		} else {
			remote.password = value.password;
		}
	}

	return remote;
}

export function validateSettings(settings: unknown): OpenCodeConnectionSettings {
	const errors: string[] = [];

	if (!isRecord(settings)) {
		throw new OpenCodeSettingsValidationError(['settings must be an object']);
	}

	const mode = settings.mode;
	if (mode !== 'local' && mode !== 'remote') {
		errors.push('mode must be "local" or "remote"');
	}

	const normalized: OpenCodeConnectionSettings = {
		mode: mode === 'remote' ? 'remote' : 'local'
	};

	if (mode === 'remote') {
		normalized.remote = normalizeRemoteSettings(settings.remote, errors);
	} else {
		normalized.local = normalizeLocalSettings(settings.local, errors);
	}

	if (errors.length > 0) {
		throw new OpenCodeSettingsValidationError(errors);
	}

	return normalized;
}
