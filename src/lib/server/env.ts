export function validateEnvironment(): void {
	const requiredVars = ['DATABASE_URL'];
	const missing = requiredVars.filter((key) => !process.env[key]);

	if (missing.length > 0) {
		throw new Error(
			`Missing required environment variables: ${missing.join(', ')}\n` +
				'Please check your .env file and ensure all required variables are set.'
		);
	}

	// ADMIN_PASSWORD is required in ALL environments - never allow bypass
	if (!process.env.ADMIN_PASSWORD) {
		throw new Error(
			'Missing required environment variable: ADMIN_PASSWORD\n\n' +
				'Admin password must be set in all environments for security.\n' +
				'Add to your .env file:\n' +
				'  ADMIN_PASSWORD=your-secure-password\n\n' +
				'Development mode does not disable authentication.'
		);
	}

	// BETTER_AUTH_SECRET is required in ALL environments
	const secret = process.env.BETTER_AUTH_SECRET;
	if (!secret || secret.length < 32) {
		throw new Error(
			'Missing or weak required environment variable: BETTER_AUTH_SECRET\n\n' +
				'Set a strong secret for session encryption (min 32 chars):\n' +
				'  BETTER_AUTH_SECRET=$(openssl rand -base64 32)\n\n' +
				'Secret must be at least 32 characters for security.'
		);
	}

	// Production-specific validation
	if (process.env.NODE_ENV === 'production') {
		const productionRequiredVars = ['OPENCODE_URL', 'ADMIN_PASSWORD', 'BETTER_AUTH_SECRET'];
		const productionMissing = productionRequiredVars.filter((key) => !process.env[key]);

		if (productionMissing.length > 0) {
			throw new Error(
				`Missing required production environment variables: ${productionMissing.join(', ')}\n\n` +
					`For ${productionMissing.join(', ')}, add them to your environment:\n` +
					productionMissing
						.map(
							(v) =>
								`  ${v}=<value>\n` +
								`  Example: ${v === 'OPENCODE_URL' ? 'http://opencode:4096' : 'your-secure-password'}`
						)
						.join('\n') +
					'\n\n' +
					'Please check your production environment configuration and deployment secrets.'
			);
		}
	} else {
		// Development mode: warn about optional but recommended vars
		if (!process.env.OPENCODE_URL) {
			console.warn(
				'WARNING: OPENCODE_URL not set. Using default: http://localhost:4096\n' +
					'To use a different OpenCode instance, set OPENCODE_URL in your .env file.'
			);
			// Set default for development convenience
			process.env.OPENCODE_URL = 'http://localhost:4096';
		}
	}
}
