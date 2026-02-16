import type { OpenCodeRemoteSettings } from './types';

function normalizeBasePath(basePath?: string): string {
	if (!basePath) {
		return '';
	}

	const trimmed = basePath.trim();
	if (!trimmed) {
		return '';
	}

	const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
	return withLeadingSlash.replace(/\/+$/, '');
}

export function buildRemoteUrl(remote: OpenCodeRemoteSettings): string {
	if (remote.baseUrl && remote.baseUrl.trim()) {
		return remote.baseUrl.trim().replace(/\/+$/, '');
	}

	if (!remote.host || !remote.port) {
		throw new Error('remote.host and remote.port are required when remote.baseUrl is not set');
	}

	const protocol = remote.protocol ?? 'http';
	const basePath = normalizeBasePath(remote.basePath);

	return `${protocol}://${remote.host}:${remote.port}${basePath}`;
}
