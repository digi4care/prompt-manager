import { drizzle } from 'drizzle-orm/libsql';
import { createClient, type Client } from '@libsql/client';
import { DATABASE_URL } from '$env/static/private';
import * as schema from './schema';

let _client: Client | null = null;

const getClient = () => {
	if (!_client) {
		_client = createClient({ url: DATABASE_URL });
	}
	return _client;
};

export const db = drizzle(getClient(), { schema });
