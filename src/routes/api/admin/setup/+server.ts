import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth } from '$lib/auth';
import { db } from '$lib/server/db/client';
import { authUsers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

const ADMIN_NAME = 'Admin';

const getAdminCredentials = () => {
	const email = process.env.ADMIN_EMAIL;
	const password = process.env.ADMIN_PASSWORD;

	if (!email || !password) {
		return { error: 'Missing ADMIN_EMAIL or ADMIN_PASSWORD' };
	}

	return { email, password };
};

export const GET: RequestHandler = async () => {
	if (process.env.NODE_ENV !== 'development') {
		throw error(404, 'Not found');
	}

	const credentials = getAdminCredentials();
	if ('error' in credentials) {
		return json({ success: false, error: credentials.error }, { status: 400 });
	}

	const existingUser = await db
		.select()
		.from(authUsers)
		.where(eq(authUsers.email, credentials.email))
		.get();

	if (existingUser) {
		return json({ success: true, message: 'Admin user already exists', email: credentials.email });
	}

	await auth.api.signUpEmail({
		body: {
			email: credentials.email,
			password: credentials.password,
			name: ADMIN_NAME
		}
	});

	return json({ success: true, message: 'Admin user created', email: credentials.email });
};
