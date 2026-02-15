import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const DATABASE_URL = process.env.DATABASE_URL || 'file:local.db';

const client = createClient({ url: DATABASE_URL });
export const db = drizzle(client, { schema });
