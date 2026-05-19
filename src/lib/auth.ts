/**
 * Better Auth Configuration
 */

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { twoFactor } from 'better-auth/plugins';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db/client';
import * as schema from '$lib/server/db/schema';
import { scrypt } from '@noble/hashes/scrypt.js';

// Better Auth scrypt config
const scryptConfig = {
	N: 16384,
	r: 16,
	p: 1,
	dkLen: 64
};

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'sqlite',
		schema: {
			...schema,
			user: schema.authUsers,
			account: schema.authAccounts,
			session: schema.authSessions,
			verification: schema.authVerifications,
			twoFactor: schema.authTwoFactor
		}
	}),

	user: {
		modelName: 'authUsers',
		fields: {
			emailVerified: 'emailVerified',
			createdAt: 'createdAt',
			updatedAt: 'updatedAt'
		}
	},

	account: {
		modelName: 'authAccounts',
		fields: {
			userId: 'userId',
			accountId: 'accountId',
			providerId: 'providerId',
			accessToken: 'accessToken',
			refreshToken: 'refreshToken',
			idToken: 'idToken',
			password: 'password',
			createdAt: 'createdAt',
			updatedAt: 'updatedAt'
		}
	},

	session: {
		modelName: 'authSessions',
		fields: {
			userId: 'userId',
			expiresAt: 'expiresAt',
			ipAddress: 'ipAddress',
			userAgent: 'userAgent',
			createdAt: 'createdAt',
			updatedAt: 'updatedAt'
		},
		expiresIn: 60 * 60 * 24 * 7,
		updateAge: 60 * 60 * 24,
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60
		}
	},

	verification: {
		modelName: 'authVerifications',
		fields: {
			expiresAt: 'expiresAt',
			createdAt: 'createdAt',
			updatedAt: 'updatedAt'
		}
	},

	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
		password: {
			hash: async (password: string) => {
				const salt = crypto.getRandomValues(new Uint8Array(16));
				const saltHex = Array.from(salt)
					.map((b) => b.toString(16).padStart(2, '0'))
					.join('');
				const key = scrypt(password.normalize('NFKC'), saltHex, scryptConfig);
				return `${saltHex}:${Buffer.from(key).toString('hex')}`;
			},
			verify: async ({ password, hash }: { password: string; hash: string }) => {
				if (!password || !hash) return false;
				const [saltHex, storedKeyHex] = hash.split(':');
				if (!saltHex || !storedKeyHex) return false;
				const key = scrypt(password.normalize('NFKC'), saltHex, scryptConfig);
				const computedKeyHex = Buffer.from(key).toString('hex');
				return computedKeyHex === storedKeyHex;
			}
		}
	},

	appURL: process.env.BETTER_AUTH_URL || 'http://localhost:5173',
	secret: process.env.BETTER_AUTH_SECRET || (() => { throw new Error('Missing BETTER_AUTH_SECRET. Generate with: openssl rand -base64 32'); })(),

	// Two-factor authentication plugin
	// SvelteKit cookie plugin - MUST be last in plugins array
	// This automatically handles cookies in server actions
	plugins: [
		twoFactor({
			twoFactorTable: 'authTwoFactor',
			issuer: 'PromptManagement'
		}),
		sveltekitCookies(getRequestEvent)
	]
});

export type Auth = typeof auth;
