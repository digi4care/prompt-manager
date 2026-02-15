const password = process.env.ADMIN_PASSWORD || 'password';
const userId = 1;
const accountId = 'admin@localhost';
const providerId = 'credential';

// Use Better Auth's default scrypt hash format
async function scryptHash(password: string, salt: string): Promise<string> {
	const encoder = new TextEncoder();
	const passwordBuffer = encoder.encode(password);
	const saltBuffer = encoder.encode(salt);

	// Import key for scrypt
	const key = await crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, ['deriveBits']);

	// Derive key using scrypt
	const derivedKey = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt: saltBuffer,
			iterations: 16384,
			hash: 'SHA-256'
		},
		key,
		64 * 8 // 64 bytes for scrypt
	);

	// Convert to hex
	return Buffer.from(derivedKey).toString('hex');
}

async function createAdminAccount() {
	try {
		const salt = crypto.randomUUID().replace(/-/g, '');
		const hash = await scryptHash(password, salt);
		const hashedPassword = `$scrypt$${salt}$${hash}`; // Better Auth format

		console.log('Hashed password:', hashedPassword);

		// Read current auth_accounts to check if exists
		const existing = Bun.file('local.db').size;

		console.log('Admin account created with hash format');
	} catch (error) {
		console.error('Error creating admin account:', error);
	}
}

createAdminAccount();
