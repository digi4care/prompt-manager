/**
 * Create Better Auth Admin User - Direct Database Access
 *
 * Creates admin user by directly inserting into Better Auth tables.
 * Reads .env file manually since $env/static/private only works in SvelteKit runtime.
 */

import { createClient } from '@libsql/client';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { scrypt } from '@noble/hashes/scrypt.js';

// Read .env file manually
const envContent = readFileSync('.env', 'utf-8');
const envVars: Record<string, string> = envContent.split('\n').reduce(
	(acc, line) => {
		const [key, ...valueParts] = line.split('=');
		if (key && valueParts.length > 0) {
			acc[key.trim()] = valueParts.join('=').trim();
		}
		return acc;
	},
	{} as Record<string, string>
);

const DATABASE_URL = envVars.DATABASE_URL || '';
const ADMIN_PASSWORD = envVars.ADMIN_PASSWORD || '';

if (!DATABASE_URL) {
	console.error('❌ DATABASE_URL not set in .env file');
	process.exit(1);
}

if (!ADMIN_PASSWORD) {
	console.error('❌ ADMIN_PASSWORD not set in .env file');
	process.exit(1);
}

const ADMIN_EMAIL = 'admin@example.com';

console.log('🔧 Creating Better Auth admin user...');
console.log(`   Email: ${ADMIN_EMAIL}`);
console.log(`   Database: ${DATABASE_URL.split('/').pop()}`);

// Create database client
const db = createClient({
	url: DATABASE_URL
});

const scryptConfig = {
	N: 16384,
	r: 16,
	p: 1,
	dkLen: 64
};

// Better Auth-compatible password hash (salt:keyHex)
async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16).toString('hex');
	const key = scrypt(password.normalize('NFKC'), salt, scryptConfig);
	return `${salt}:${Buffer.from(key).toString('hex')}`;
}

async function checkAdminUser() {
	console.log('🔍 Checking if admin user already exists...');

	const result = await db.execute({
		sql: 'SELECT id, email, name, created_at FROM auth_users WHERE email = ? LIMIT 1',
		args: [ADMIN_EMAIL]
	});

	if (result.rows.length > 0) {
		console.log('⚠️  Admin user already exists!');
		console.log(`   ID: ${result.rows[0].id}`);
		console.log(`   Email: ${result.rows[0].email}`);
		console.log(`   Name: ${result.rows[0].name}`);
		return result.rows[0] as unknown as {
			id: string;
			email: string;
			name: string;
			created_at: number;
		};
	}

	return null;
}

async function createAdminUser() {
	console.log('✨ Creating admin user...');

	const now = Math.floor(Date.now() / 1000);
	const userId = randomBytes(16).toString('hex');

	await db.execute({
		sql: 'INSERT INTO auth_users (id, email, email_verified, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
		args: [userId, ADMIN_EMAIL, 1, 'Admin', now, now]
	});

	console.log(`   User ID: ${userId}`);
	console.log(`   Email: ${ADMIN_EMAIL}`);

	return userId;
}

async function createAdminAccount(userId: string) {
	console.log('🔐 Creating admin account with password...');

	const now = Math.floor(Date.now() / 1000);
	const id = randomBytes(16).toString('hex');
	const accountId = `${userId}-admin`;
	const passwordHash = await hashPassword(ADMIN_PASSWORD);

	await db.execute({
		sql: 'INSERT INTO auth_accounts (id, user_id, account_id, provider_id, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
		args: [id, userId, accountId, 'credential', passwordHash, now, now]
	});

	console.log(`   Account ID: ${accountId}`);
	console.log(`   Provider: credential`);
	console.log(`   Password hash: ${passwordHash.substring(0, 20)}...`);
}

async function main() {
	try {
		// Check if admin user exists
		const existingUser = await checkAdminUser();

		if (existingUser) {
			console.log('\n✅ Admin user already exists in Better Auth');
			console.log('   No migration needed!');
			return;
		}

		// Create admin user
		const userId = await createAdminUser();

		// Create admin account with password
		await createAdminAccount(userId);

		console.log('\n✅ Better Auth admin user created successfully!');
		console.log('\n📋 Summary:');
		console.log(`   Email: ${ADMIN_EMAIL}`);
		console.log(`   Password: ${ADMIN_PASSWORD.replace(/./g, '*')} (from ADMIN_PASSWORD)`);
		console.log(`   User ID: ${userId}`);
		console.log('\n💡 Next steps:');
		console.log('   - Update login action to use Better Auth signIn API');
		console.log('   - Update hooks.server.ts to use Better Auth session validation');
		console.log('   - Test admin login with Better Auth');
		console.log('\n⚠️  Note: Password stored with Better Auth-compatible scrypt format');

		process.exit(0);
	} catch (err) {
		console.error('\n❌ Failed to create admin user:', err);
		process.exit(1);
	}
}

main();
