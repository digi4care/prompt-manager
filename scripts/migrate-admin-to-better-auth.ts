import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '$lib/server/db/schema';
import { authUsers, adminUsers } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL || 'file:local.db';
const client = createClient({ url: DATABASE_URL });
const db = drizzle(client, { schema });

async function migrateAdminUsers() {
	console.log('🔍 Fetching admin users from database...');

	const admins = await db.select().from(adminUsers);

	console.log(`Found ${admins.length} admin users:\n`);

	for (const admin of admins) {
		console.log(`- ID: ${admin.id}`);
		console.log(`  Username: ${admin.username}`);
		console.log(`  Role: ${admin.role}`);
		console.log(`  Created: ${new Date(admin.createdAt * 1000).toISOString()}`);
		console.log(`  Active: ${admin.isActive ? 'Yes' : 'No'}`);
		console.log('');
	}

	// Migration summary
	const activeAdmins = admins.filter((a) => a.isActive);
	console.log(`\n📊 Summary:`);
	console.log(`- Total admins: ${admins.length}`);
	console.log(`- Active admins: ${activeAdmins.length}`);
	console.log(`- Email format: username@localhost`);
	console.log(`- Password hash: Using existing argon2 hashes`);

	// Check if already migrated
	console.log('\n🔍 Checking for existing migrations...');
	for (const admin of activeAdmins) {
		const email = `${admin.username}@localhost`;
		const existing = await db.select().from(authUsers).where(eq(authUsers.email, email)).get();

		if (existing) {
			console.log(`  ⚠️  ${email} already exists in auth_users (skipping)`);
		} else {
			console.log(`  ✅  ${email} can be migrated`);
		}
	}

	console.log('\n✅ Admin users listed successfully!');
	process.exit(0);
}

migrateAdminUsers().catch((err) => {
	console.error('❌ Error listing admin users:', err);
	process.exit(1);
});
