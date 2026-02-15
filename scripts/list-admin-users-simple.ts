import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

const dbPath = join(process.cwd(), 'data', 'prompt-management.db');
const db = new Database(dbPath);

interface AdminUser {
	id: number;
	username: string;
	role: string;
	isActive: number;
	passwordHash: string;
	createdAt: number;
}

async function migrateAdminUsers() {
	console.log('🔍 Fetching admin users from database...');

	const admins = db
		.prepare<
			AdminUser[]
		>('SELECT id, username, role, isActive, passwordHash, createdAt FROM admin_users')
		.all();

	console.log(`Found ${admins.length} admin users:\n`);

	for (const admin of admins) {
		console.log(`- ID: ${admin.id}`);
		console.log(`  Username: ${admin.username}`);
		console.log(`  Role: ${admin.role}`);
		console.log(`  Created: ${new Date(admin.createdAt * 1000).toISOString()}`);
		console.log(`  Active: ${admin.isActive ? 'Yes' : 'No'}`);
		console.log(`  Password Hash: ${admin.passwordHash.substring(0, 20)}...`);
		console.log('');
	}

	// Migration summary
	const activeAdmins = admins.filter((a) => a.isActive);
	console.log(`\n📊 Summary:`);
	console.log(`- Total admins: ${admins.length}`);
	console.log(`- Active admins: ${activeAdmins.length}`);
	console.log(`- Email format: username@localhost`);
	console.log(`- Password hash: Using existing argon2 hashes`);

	console.log('\n✅ Admin users listed successfully!');
	db.close();
	process.exit(0);
}

migrateAdminUsers().catch((err) => {
	console.error('❌ Error listing admin users:', err);
	db.close();
	process.exit(1);
});
