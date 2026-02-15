import Database from 'better-sqlite3';

// Read .env file directly
import { readFileSync } from 'fs';
const envContent = readFileSync('.env', 'utf-8');
const ADMIN_EMAIL = envContent.match(/ADMIN_EMAIL=(.+)/)?.[1]?.trim() || 'admin@localhost';
const ADMIN_PASSWORD = envContent.match(/ADMIN_PASSWORD=(.+)/)?.[1]?.trim() || 'password';

console.log(`📧 Creating admin: ${ADMIN_EMAIL}`);

async function createAdmin() {
	try {
		const db = new Database('local.db');

		// Check if user already exists
		const existingUser = db.prepare('SELECT id FROM auth_users WHERE email = ?').get(ADMIN_EMAIL);
		if (existingUser) {
			console.log('✅ User already exists, skipping');
			return;
		}

		// Hash password using scrypt (Better Auth format)
		const encoder = new TextEncoder();
		const passwordBuffer = encoder.encode(ADMIN_PASSWORD);
		const salt = crypto.getRandomValues(new Uint8Array(16));
		const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');

		// Use PBKDF2 to derive key
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
		const now = Date.now();
		const userId = db.prepare('INSERT INTO auth_users (email, emailVerified, name, image, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(ADMIN_EMAIL, now, 'Admin', null, now, now).lastInsertRowid;
		console.log(`✅ Created user: ${ADMIN_EMAIL}`);

		// Create account
		db.prepare('INSERT INTO auth_accounts (user_id, account_id, provider_id, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(userId, ADMIN_EMAIL, 'credential', passwordHash, now, now);
		console.log(`✅ Created account with password`);
		console.log(`\n📧 Email: ${ADMIN_EMAIL}`);
		console.log(`🔑 Password: ${ADMIN_PASSWORD}`);

		db.close();
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
