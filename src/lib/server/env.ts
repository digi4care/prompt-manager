export function validateEnvironment(): void {
	const requiredVars = ['DATABASE_URL'];
	const missing = requiredVars.filter((key) => !process.env[key]);

	if (missing.length > 0) {
		throw new Error(
			`Missing required environment variables: ${missing.join(', ')}\n` +
				'Please check your .env file and ensure all required variables are set.'
		);
	}

	// Production-specific validation
	if (process.env.NODE_ENV === 'production') {
		const productionRequiredVars = ['OPENCODE_URL', 'ADMIN_PASSWORD'];
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

		if (!process.env.ADMIN_PASSWORD) {
			console.warn(
				'WARNING: ADMIN_PASSWORD not set in development mode.\n' +
					'Admin routes will allow bypass access. Set ADMIN_PASSWORD for testing auth flows.'
			);
		}
	}
}
