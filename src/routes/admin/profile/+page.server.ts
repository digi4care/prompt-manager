import { auth } from '$lib/auth';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals?.auth?.session) {
		throw redirect(302, '/login');
	}

	// Get 2FA status from user
	const user = locals.auth.user;
	const twoFactorEnabled = user?.twoFactorEnabled ?? false;

	return {
		user,
		twoFactorEnabled
	};
};

export const actions: Actions = {
	changePassword: async ({ request, locals }) => {
		if (!locals?.auth?.session) {
			return fail(401, { error: 'Not authenticated' });
		}

		const formData = await request.formData();
		const currentPassword = formData.get('currentPassword')?.toString();
		const newPassword = formData.get('newPassword')?.toString();
		const confirmPassword = formData.get('confirmPassword')?.toString();

		// Validation
		if (!currentPassword || !newPassword || !confirmPassword) {
			return fail(400, { error: 'All fields are required' });
		}

		if (newPassword !== confirmPassword) {
			return fail(400, { error: 'New passwords do not match' });
		}

		if (newPassword.length < 8) {
			return fail(400, { error: 'Password must be at least 8 characters' });
		}

		try {
			await auth.api.changePassword({
				headers: request.headers,
				body: {
					currentPassword,
					newPassword
				}
			});

			return { success: true, message: 'Password changed successfully' };
		} catch (err) {
			console.error('Password change failed:', err);
			const errorMessage = err instanceof Error ? err.message : 'Failed to change password';
			return fail(400, { error: errorMessage });
		}
	},

	enable2FA: async ({ request, locals }) => {
		if (!locals?.auth?.session) {
			return fail(401, { error: 'Not authenticated' });
		}

		const formData = await request.formData();
		const password = formData.get('password')?.toString();

		if (!password) {
			return fail(400, { error: 'Password is required' });
		}

		try {
			const result = await auth.api.enableTwoFactor({
				headers: request.headers,
				body: { password }
			});

			return {
				success: true,
				totpURI: result.totpURI,
				backupCodes: result.backupCodes
			};
		} catch (err) {
			console.error('2FA enable failed:', err);
			const errorMessage = err instanceof Error ? err.message : 'Failed to enable 2FA';
			return fail(400, { error: errorMessage });
		}
	},

	disable2FA: async ({ request, locals }) => {
		if (!locals?.auth?.session) {
			return fail(401, { error: 'Not authenticated' });
		}

		const formData = await request.formData();
		const password = formData.get('password')?.toString();

		if (!password) {
			return fail(400, { error: 'Password is required' });
		}

		try {
			await auth.api.disableTwoFactor({
				headers: request.headers,
				body: { password }
			});

			return { success: true, message: '2FA disabled successfully' };
		} catch (err) {
			console.error('2FA disable failed:', err);
			const errorMessage = err instanceof Error ? err.message : 'Failed to disable 2FA';
			return fail(400, { error: errorMessage });
		}
	},

	verifyTotp: async ({ request, locals }) => {
		if (!locals?.auth?.session) {
			return fail(401, { error: 'Not authenticated' });
		}

		const formData = await request.formData();
		const rawCode = formData.get('code')?.toString() ?? '';
		const code = rawCode.replace(/\D/g, '');

		if (!code) {
			return fail(400, { error: 'TOTP code is required' });
		}

		if (code.length !== 6) {
			return fail(400, { error: 'TOTP code must contain exactly 6 digits' });
		}

		try {
			await auth.api.verifyTOTP({
				headers: request.headers,
				body: { code, trustDevice: true }
			});

			return { success: true, message: '2FA verified successfully' };
		} catch (err) {
			console.error('TOTP verification failed:', err);
			const errorMessage = err instanceof Error ? err.message : 'Invalid TOTP code';
			return fail(400, { error: errorMessage });
		}
	}
};
