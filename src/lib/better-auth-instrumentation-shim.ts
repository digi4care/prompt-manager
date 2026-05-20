/**
 * Shim for @better-auth/core/instrumentation
 *
 * better-auth@1.5.0+ dist files import from @better-auth/core/instrumentation,
 * but @better-auth/core@1.5.0 does not export this subpath.
 * This shim provides the expected exports so Vite can bundle correctly.
 */

// Attribute constants used by better-auth
export const ATTR_CONTEXT = 'attr.context';
export const ATTR_HOOK_TYPE = 'attr.hook_type';
export const ATTR_HTTP_ROUTE = 'attr.http_route';
export const ATTR_OPERATION_ID = 'attr.operation_id';
export const ATTR_HTTP_RESPONSE_STATUS_CODE = 'attr.http_response_status_code';
export const ATTR_DB_COLLECTION_NAME = 'attr.db_collection_name';

// withSpan signature: (name, attributes, fn) => Promise<fn_result>
export function withSpan<T>(
	_name: string,
	_attributes: Record<string, unknown>,
	fn: () => T | Promise<T>
): T | Promise<T> {
	return fn();
}
