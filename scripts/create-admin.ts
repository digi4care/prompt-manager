import { db } from '../src/lib/server/db/client.ts';
import { authUsers, authAccounts } from '../src/lib/server/db/schema.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@localhost';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password';

async function createAdmin() {
	try {
		const encoder = new TextEncoder();
		const passwordBuffer = encoder.encode(ADMIN_PASSWORD);

		// Generate salt
		const salt = crypto.getRandomValues(new Uint8Array(16));
		const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');

		// Derive key using scrypt (Better Auth format)
		const keyMaterial = await crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, ['deriveKey']);
		const key = await crypto.subtle.deriveKey(
			{ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
			keyMaterial,
			{ name: 'AES-GCM', length: 256 },
			true,
			['encrypt', 'decrypt']
		);
		const exportedKey = await crypto.subtle.exportKey('raw', key);
		const keyHex = Array.from(new Uint8Array(exportedKey)).map(b => b.toString(16).padStart(2, '0')).join('');
		const passwordHash = `${saltHex}:${keyHex}`;

		// Create user
		const userId = await db.insert(authUsers).values({
			email: ADMIN_EMAIL,
			emailVerified: Date.now(),
			name: 'Admin',
			image: null,
			createdAt: Date.now(),
			updatedAt: Date.now()
		}).returning({ id: authUsers.id }).get().then(r => r.id);

		console.log(`✅ Created user: ${ADMIN_EMAIL}`);

		// Create account
		await db.insert(authAccounts).values({
			userId,
			accountId: ADMIN_EMAIL,
			providerId: 'credential',
			password: passwordHash,
			createdAt: Date.now(),
			updatedAt: Date.now()
		});

		console.log(`✅ Created account with password`);
		console.log(`\n📧 Email: ${ADMIN_EMAIL}`);
		console.log(`🔑 Password: ${ADMIN_PASSWORD}`);
	} catch (err) {
		console.error('❌ Error:', err);
		throw err;
	}
}

createAdmin().then(() => {
	console.log('\n✅ Done');
	process.exit(0);
}).catch(err => {
	console.error('❌ Failed:', err);
	process.exit(1);
});
