import { drizzle } from 'drizzle-orm/bun-sqlite';
// @ts-expect-error bun runtime only
import Database from 'bun:sqlite';
import * as schema from '$lib/server/db/schema';

const sqlite = new Database('local.db');

export const db = drizzle(sqlite, { schema });
