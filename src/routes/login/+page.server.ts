import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/auth';

// Disable SSR to prevent hydration mismatch with Svelte 5 + shadcn-svelte
export const ssr = false;

export const load: PageServerLoad = async ({ locals }) => {
	// If already authenticated, redirect to admin
	if (locals?.auth?.session) {
		throw redirect(302, '/admin');
	}

	return {};
};

// Single login action that handles both password and 2FA in one flow
export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;
		const code = formData.get('code')?.toString().replace(/\D/g, '');

		// Step 1: If no code, do initial login
		if (!code) {
			try {
				const result = (await auth.api.signInEmail({
					body: { email, password }
				})) as { twoFactorRedirect?: boolean; user?: { email: string } };

				// Check if 2FA is required
				if (result?.twoFactorRedirect) {
					return {
						success: true,
						requiresTwoFactor: true,
						email: result.user?.email || email
					};
				}

				throw redirect(302, '/admin');
			} catch (err: any) {
				if (err?.status === 302) throw err;

				console.error('[LOGIN] Error:', err);
				return fail(400, {
					error: err.body?.message || err.message || 'Invalid email or password'
				});
			}
		}

		// Step 2: Verify 2FA code (same request context - cookies available)
		try {
			console.log('[LOGIN 2FA] Verifying code:', code);

			await auth.api.verifyTOTP({
				headers: request.headers,
				body: { code, trustDevice: true }
			});

			throw redirect(302, '/admin');
		} catch (err: any) {
			if (err?.status === 302) throw err;

			console.error('[LOGIN 2FA] Error:', err);
			return fail(400, {
				error: err.body?.message || err.message || 'Invalid verification code',
				requiresTwoFactor: true,
				email
			});
		}
	}
};
