import { db } from '$lib/server/db/client';
import { adminUsers } from '$lib/server/db/schema';
import { authUsers } from '$lib/server/db/schema';
import { argon2 } from 'argon2';
import { betterAuth } from '$lib/auth';

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
	console.log(
		`- Password hash: ${activeAdmins.length > 0 ? 'Using existing argon2 hashes' : 'N/A'}`
	);

	console.log('\n✅ Admin users listed successfully!');
	process.exit(0);
}

migrateAdminUsers().catch((err) => {
	console.error('❌ Error listing admin users:', err);
	process.exit(1);
});
