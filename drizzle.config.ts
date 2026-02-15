import type { Config } from 'drizzle-kit';
import 'dotenv/config';

export default {
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle/migrations',
	dialect: 'sqlite',
	dbCredentials: {
		url: process.env.DATABASE_URL || 'file:local.db'
	}
} satisfies Config;
