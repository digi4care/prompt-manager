import { createLogger, format, transports } from 'winston';
import { randomBytes } from 'crypto';

// Create audit logger
const auditLogger = createLogger({
	level: 'info',
	format: format.combine(format.timestamp(), format.json()),
	transports: [
		new transports.File({ filename: 'logs/audit.log' }),
		new transports.Console({
			format: format.combine(
				format.colorize(),
				format.printf(({ level, message, timestamp, ...metadata }) => {
					return `${timestamp} [${level}]: ${message} ${JSON.stringify(metadata)}`;
				})
			)
		})
	]
});

// Ensure logs directory exists
import { existsSync, mkdirSync } from 'fs';
if (!existsSync('logs')) {
	mkdirSync('logs', { recursive: true });
}

export interface AuditEvent {
	action: string;
	userId?: string;
	userRole?: string;
	resource: string;
	resourceId?: string | number;
	details?: Record<string, unknown>;
	ip?: string;
	userAgent?: string;
	success: boolean;
	reason?: string;
}

/**
 * Log an audit event
 */
export async function logAuditEvent(event: AuditEvent): Promise<void> {
	const sanitizedDetails = sanitizeSensitiveData(event.details || {});

	auditLogger.info('AUDIT_EVENT', {
		action: event.action,
		userId: event.userId || 'anonymous',
		userRole: event.userRole || 'none',
		resource: event.resource,
		resourceId: event.resourceId,
		details: sanitizedDetails,
		ip: maskIp(event.ip),
		userAgent: event.userAgent,
		success: event.success,
		reason: event.reason
	});
}

/**
 * Sanitize sensitive data from objects
 */
function sanitizeSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
	const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'key', 'auth'];
	const sanitized: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(data)) {
		if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
			sanitized[key] = '[REDACTED]';
		} else if (typeof value === 'object' && value !== null) {
			sanitized[key] = sanitizeSensitiveData(value as Record<string, unknown>);
		} else {
			sanitized[key] = value;
		}
	}

	return sanitized;
}

/**
 * Mask IP address (keep first 2 octets)
 */
function maskIp(ip?: string): string {
	if (!ip) return 'unknown';
	const parts = ip.split('.');
	if (parts.length === 4) {
		return `${parts[0]}.${parts[1]}.xxx.xxx`;
	}
	return ip;
}

/**
 * Log security event
 */
export async function logSecurityEvent(
	event: string,
	metadata: Record<string, unknown>
): Promise<void> {
	auditLogger.warn('SECURITY_EVENT', {
		event,
		...sanitizeSensitiveData(metadata),
		timestamp: new Date().toISOString()
	});
}

/**
 * Log data change
 */
export async function logDataChange(
	action: 'create' | 'update' | 'delete',
	resource: string,
	resourceId: string | number,
	changes: Record<string, { old?: unknown; new?: unknown }>,
	userId?: string
): Promise<void> {
	await logAuditEvent({
		action: `data:${action}`,
		userId,
		resource,
		resourceId,
		details: { changes },
		success: true
	});
}

/**
 * Generate request ID for tracing
 */
export function generateRequestId(): string {
	return randomBytes(16).toString('hex');
}
