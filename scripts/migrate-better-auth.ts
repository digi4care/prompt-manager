/**
 * Manual migration script for Better Auth tables
 * This script creates Better Auth tables (auth_*) directly on database using libsql
 */

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '$lib/server/db/schema';
import fs from 'fs';
import path from 'path';

async function main() {
	console.log('🚀 Starting Better Auth migration...');

	// Read database URL from env
	const dbUrl = process.env.DATABASE_URL || 'file:local.db';
	console.log(`📦 Database: ${dbUrl}`);

	// Create database connection using libsql
	const client = createClient({ url: dbUrl });
	const db = drizzle(client, { schema });

	try {
		// Execute migration SQL directly
		const migrationSQL = fs.readFileSync('/tmp/better-auth-migration.sql', 'utf-8');

		console.log('📝 Executing migration SQL...');
		const statements = migrationSQL.split(';').filter((s) => s.trim());

		for (const statement of statements) {
			if (statement.trim()) {
				try {
					await client.execute(statement);
					console.log(`✅ Executed: ${statement.slice(0, 50)}...`);
				} catch (error) {
					const err = error as { message?: string };
					// Ignore "already exists" errors (expected for IF NOT EXISTS)
					if (!err.message?.includes('already exists')) {
						console.error(`❌ Error: ${err.message}`);
						console.error(`Statement: ${statement.slice(0, 100)}...`);
						throw error;
					}
					console.log(`⏭️  Skipped (already exists): ${statement.slice(0, 50)}...`);
				}
			}
		}

		console.log('✅ Migration completed successfully!');

		// Verify tables were created
		const result = await client.execute(
			"SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'auth_%'"
		);
		const tables = result.rows;
		console.log(
			`📊 Created ${tables.length} Better Auth tables:`,
			tables.map((t: any) => t.name)
		);

		console.log('🎉 All done!');
	} catch (error) {
		console.error('❌ Migration failed:', error);
		process.exit(1);
	} finally {
		client.close();
	}
}

main();
