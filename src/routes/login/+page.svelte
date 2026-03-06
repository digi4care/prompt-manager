<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import type { ActionResult } from '@sveltejs/kit';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { auth } from '$lib/auth.svelte';
	import { Eye, EyeOff } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { browser } from '$app/environment';

	// Form data type from server action
	type ActionData = {
		success?: boolean;
		requiresTwoFactor?: boolean;
		email?: string;
		error?: string;
	};

	let { form }: { form: ActionData } = $props();

	let loading = $state(false);
	let showTwoFactor = $state(form?.requiresTwoFactor ?? false);
	let showPassword = $state(false);
	let email = $state(form?.email ?? '');
	let password = $state('');
	let totpCode = $state('');
	let isBrowser = $state(false);

	// Derived error from form
	let error = $derived(form?.error ?? '');

	// Svelte 5: Use $effect for browser detection
	$effect(() => {
		isBrowser = browser;
	});

	// Svelte 5: Reactive redirect when authenticated
	$effect(() => {
		if (browser && auth.isAuthenticated && !loading) {
			goto('/settings');
		}
	});

	// Svelte 5: Watch for 2FA requirement from form result
	$effect(() => {
		if (form?.requiresTwoFactor && form?.email) {
			showTwoFactor = true;
			email = form.email;
		}
	});

	// Single enhance handler for the form
	const handleFormSubmit = () => {
		loading = true;

		return async ({ result }: { result: ActionResult }) => {
			loading = false;

			if (result.type === 'redirect') {
				// Refresh auth state before redirect so navigation shows correctly
				await auth.checkSession();
				await invalidateAll();
				goto(result.location);
				return;
			}

			if (result.type === 'success' && result.data) {
				const data = result.data as ActionData;
				if (data.requiresTwoFactor && data.email) {
					showTwoFactor = true;
					email = data.email;
				} else if (data.success) {
					// Refresh auth state before redirect
					await auth.checkSession();
					await invalidateAll();
					goto('/settings');
				}
			}
		};
	};
</script>

<div class="flex min-h-screen items-center justify-center p-4">
	<Card class="w-full max-w-md">
		<CardHeader class="space-y-1">
			<CardTitle class="text-2xl font-bold">
				{#if showTwoFactor}
					Two-Factor Authentication
				{:else}
					Admin Login
				{/if}
			</CardTitle>
			<CardDescription>
				{#if showTwoFactor}
					Enter the 6-digit code from your authenticator app
				{:else}
					Enter your email and password to access the admin panel
				{/if}
			</CardDescription>
		</CardHeader>
		<CardContent>
			<!-- Single form that handles both password and 2FA -->
			<form method="POST" use:enhance={handleFormSubmit} class="space-y-4">
				{#if showTwoFactor}
					<!-- 2FA step - hidden email/password + code input -->
					<input type="hidden" name="email" value={email} />
					<input type="hidden" name="password" value={password} />

					<div class="rounded-md bg-muted p-3 text-center text-sm">
						<p class="text-muted-foreground">Verifying for:</p>
						<p class="font-medium">{email}</p>
					</div>

					<div class="space-y-2">
						<label for="totpCode" class="text-sm font-medium">Verification Code</label>
						<Input
							id="totpCode"
							name="code"
							type="text"
							placeholder="000000"
							inputmode="numeric"
							autocomplete="one-time-code"
							maxlength="6"
							required
							bind:value={totpCode}
							disabled={loading}
							class="text-center text-2xl tracking-widest"
						/>
					</div>

					{#if error}
						<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
							{error}
						</div>
					{/if}

					<Button type="submit" class="w-full" disabled={loading || totpCode.length !== 6}>
						{#if loading}
							Verifying...
						{:else}
							Verify
						{/if}
					</Button>

					<button
						type="button"
						class="w-full text-center text-sm text-muted-foreground hover:text-foreground"
						onclick={() => {
							showTwoFactor = false;
							totpCode = '';
						}}
					>
						← Back to login
					</button>
				{:else}
					<!-- Login step -->
					<div class="space-y-2">
						<label for="email" class="text-sm font-medium">Email</label>
						<Input
							id="email"
							name="email"
							type="email"
							placeholder="Enter admin email"
							autocomplete="email"
							required
							bind:value={email}
							disabled={loading}
						/>
					</div>
					<div class="space-y-2">
						<label for="password" class="text-sm font-medium">Password</label>
						<div class="relative">
							<Input
								id="password"
								name="password"
								type={showPassword ? 'text' : 'password'}
								placeholder="Enter admin password"
								autocomplete="current-password"
								required
								bind:value={password}
								disabled={loading}
								class="pr-10"
							/>
							<button
								type="button"
								onclick={() => (showPassword = !showPassword)}
								class="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
								tabindex="-1"
							>
								{#if showPassword}
									<EyeOff class="h-4 w-4" />
								{:else}
									<Eye class="h-4 w-4" />
								{/if}
							</button>
						</div>
					</div>

					{#if error}
						<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
							{error}
						</div>
					{/if}

					<Button type="submit" class="w-full" disabled={loading}>
						{#if loading}
							Logging in...
						{:else}
							Login
						{/if}
					</Button>
				{/if}
			</form>

			{#if isBrowser && import.meta.env.DEV && !showTwoFactor}
				<div class="mt-4 border-t pt-4">
					<p class="mb-2 text-center text-sm text-muted-foreground">Development Options</p>
					<div class="mb-3 rounded bg-muted p-3">
						<p class="mb-1 text-center text-xs font-semibold">Login Credentials</p>
						<p class="text-center text-xs">
							Email: <span class="font-mono">admin@example.com</span>
						</p>
						<p class="text-center text-xs">Password: <span class="font-mono">password</span></p>
					</div>
				</div>
			{/if}
		</CardContent>
	</Card>
</div>
