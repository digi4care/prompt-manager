<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { toast } from '$lib/components/ui/toast';
	import Eye from 'lucide-svelte/icons/eye';
	import EyeOff from 'lucide-svelte/icons/eye-off';
	import Shield from 'lucide-svelte/icons/shield';
	import ShieldCheck from 'lucide-svelte/icons/shield-check';
	import Key from 'lucide-svelte/icons/key';
	import User from 'lucide-svelte/icons/user';

	type ActionData = {
		success?: boolean;
		message?: string;
		error?: string;
		totpURI?: string;
		backupCodes?: string[];
	};

	let {
		data,
		form
	}: { data: { user: { email: string }; twoFactorEnabled: boolean }; form: ActionData } = $props();

	let loading = $state(false);
	let showCurrentPassword = $state(false);
	let showNewPassword = $state(false);
	let showConfirmPassword = $state(false);

	// 2FA state
	let show2FAPassword = $state(false);
	let twoFactorEnabled = $state(false);
	let showQRCode = $state(false);
	let totpURI = $state<string | null>(null);
	let qrCodeDataUrl = $state<string | null>(null);
	let backupCodes = $state<string[]>([]);
	let totpCode = $state('');
	let activeTab = $state('password');

	// Sync twoFactorEnabled with server data
	$effect(() => {
		twoFactorEnabled = data.twoFactorEnabled;
	});

	// Check if form returned 2FA setup data
	$effect(() => {
		if (form?.success && form?.totpURI) {
			totpURI = form.totpURI;
			backupCodes = form.backupCodes || [];
			showQRCode = true;
			twoFactorEnabled = true;
			void generateQRCode(form.totpURI);
		}
	});

	const generateQRCode = async (uri: string) => {
		try {
			const QRCode = await import('qrcode');
			qrCodeDataUrl = await QRCode.toDataURL(uri, {
				width: 220,
				margin: 1
			});
		} catch {
			qrCodeDataUrl = null;
		}
	};

	const handleSubmit = () => {
		loading = true;
		return async ({ result }: { result: any }) => {
			loading = false;
			if (result.type === 'success' && result.data?.success) {
				toast({ title: 'Success', description: result.data.message, variant: 'success' });
				(document.querySelector('form[name="passwordForm"]') as HTMLFormElement)?.reset();
			} else if (result.type === 'failure' && result.data?.error) {
				toast({ title: 'Error', description: result.data.error, variant: 'destructive' });
			}
		};
	};

	const handle2FAEnable = () => {
		return async ({ result }: { result: any }) => {
			if (result.type === 'success' && result.data?.totpURI) {
				totpURI = result.data.totpURI;
				backupCodes = result.data.backupCodes || [];
				showQRCode = true;
				twoFactorEnabled = true;
				void generateQRCode(result.data.totpURI);
				toast({
					title: '2FA Setup',
					description: 'Scan the QR code with your authenticator app',
					variant: 'success'
				});
			} else if (result.type === 'failure' && result.data?.error) {
				toast({ title: 'Error', description: result.data.error, variant: 'destructive' });
			}
		};
	};

	const handle2FADisable = () => {
		return async ({ result }: { result: any }) => {
			if (result.type === 'success' && result.data?.success) {
				twoFactorEnabled = false;
				showQRCode = false;
				totpURI = null;
				qrCodeDataUrl = null;
				backupCodes = [];
				toast({ title: 'Success', description: result.data.message, variant: 'success' });
				await invalidateAll();
			} else if (result.type === 'failure' && result.data?.error) {
				toast({ title: 'Error', description: result.data.error, variant: 'destructive' });
			}
		};
	};

	const handleVerifyTotp = () => {
		return async ({ result }: { result: any }) => {
			if (result.type === 'success' && result.data?.success) {
				showQRCode = false;
				toast({ title: 'Success', description: '2FA verified and enabled!', variant: 'success' });
			} else if (result.type === 'failure' && result.data?.error) {
				toast({ title: 'Error', description: result.data.error, variant: 'destructive' });
			}
		};
	};
</script>

<div class="flex min-h-screen items-start justify-center p-4 pt-8">
	<Card class="w-full max-w-lg">
		<CardHeader class="space-y-1">
			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
					<User class="h-5 w-5 text-primary" />
				</div>
				<div>
					<CardTitle class="text-2xl font-bold">Profile Settings</CardTitle>
					<CardDescription>Manage your account security and preferences</CardDescription>
				</div>
			</div>
		</CardHeader>
		<CardContent>
			<!-- User Info -->
			<div class="mb-6 rounded-lg bg-muted/50 p-4">
				<Label class="text-muted-foreground">Email</Label>
				<p class="text-lg font-semibold">{data.user.email}</p>
			</div>

			<Tabs bind:value={activeTab} class="w-full">
				<TabsList class="grid w-full grid-cols-2">
					<TabsTrigger value="password" class="flex items-center gap-2">
						<Key class="h-4 w-4" />
						Password
					</TabsTrigger>
					<TabsTrigger value="2fa" class="flex items-center gap-2">
						{#if twoFactorEnabled}
							<ShieldCheck class="h-4 w-4 text-green-500" />
						{:else}
							<Shield class="h-4 w-4" />
						{/if}
						2FA
						{#if twoFactorEnabled}
							<span class="ml-1 rounded-full bg-green-500 px-1.5 py-0.5 text-[10px] text-white"
								>On</span
							>
						{/if}
					</TabsTrigger>
				</TabsList>

				<!-- Password Tab -->
				<TabsContent value="password" class="mt-4">
					<form
						method="POST"
						action="?/changePassword"
						use:enhance={handleSubmit}
						name="passwordForm"
						class="space-y-4"
					>
						<!-- Hidden username for accessibility/password managers -->
						<input
							type="hidden"
							name="username"
							value={data.user.email}
							autocomplete="username"
							readonly
						/>

						<div class="space-y-2">
							<Label for="currentPassword">Current Password</Label>
							<div class="relative">
								<Input
									id="currentPassword"
									name="currentPassword"
									type={showCurrentPassword ? 'text' : 'password'}
									autocomplete="current-password"
									placeholder="Enter current password"
									required
									disabled={loading}
									class="pr-10"
								/>
								<button
									type="button"
									class="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
									onclick={() => (showCurrentPassword = !showCurrentPassword)}
									aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
								>
									{#if showCurrentPassword}
										<EyeOff class="h-4 w-4" />
									{:else}
										<Eye class="h-4 w-4" />
									{/if}
								</button>
							</div>
						</div>

						<div class="space-y-2">
							<Label for="newPassword">New Password</Label>
							<div class="relative">
								<Input
									id="newPassword"
									name="newPassword"
									type={showNewPassword ? 'text' : 'password'}
									autocomplete="new-password"
									placeholder="Enter new password"
									required
									disabled={loading}
									class="pr-10"
								/>
								<button
									type="button"
									class="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
									onclick={() => (showNewPassword = !showNewPassword)}
									aria-label={showNewPassword ? 'Hide password' : 'Show password'}
								>
									{#if showNewPassword}
										<EyeOff class="h-4 w-4" />
									{:else}
										<Eye class="h-4 w-4" />
									{/if}
								</button>
							</div>
						</div>

						<div class="space-y-2">
							<Label for="confirmPassword">Confirm New Password</Label>
							<div class="relative">
								<Input
									id="confirmPassword"
									name="confirmPassword"
									type={showConfirmPassword ? 'text' : 'password'}
									autocomplete="new-password"
									placeholder="Confirm new password"
									required
									disabled={loading}
									class="pr-10"
								/>
								<button
									type="button"
									class="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
									onclick={() => (showConfirmPassword = !showConfirmPassword)}
									aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
								>
									{#if showConfirmPassword}
										<EyeOff class="h-4 w-4" />
									{:else}
										<Eye class="h-4 w-4" />
									{/if}
								</button>
							</div>
						</div>

						<Button type="submit" class="w-full" disabled={loading}>
							{#if loading}
								Updating...
							{:else}
								Change Password
							{/if}
						</Button>
					</form>
				</TabsContent>

				<!-- 2FA Tab -->
				<TabsContent value="2fa" class="mt-4">
					{#if showQRCode && totpURI}
						<!-- QR Code Setup -->
						<div class="space-y-4">
							<div class="rounded-lg border border-primary/20 bg-primary/5 p-4">
								<p class="text-sm font-medium text-primary">Step 1: Scan QR Code</p>
								<p class="mt-1 text-sm text-muted-foreground">
									Use Google Authenticator, Authy, or similar app
								</p>
								<div class="mt-4 flex justify-center">
									{#if qrCodeDataUrl}
										<img
											src={qrCodeDataUrl}
											alt="2FA QR Code"
											class="rounded-lg border bg-white p-2"
										/>
									{:else}
										<p class="rounded-md bg-muted p-3 text-xs break-all">{totpURI}</p>
									{/if}
								</div>
							</div>

							{#if backupCodes.length > 0}
								<div
									class="rounded-lg border border-amber-500/20 bg-amber-50 p-4 dark:bg-amber-950/20"
								>
									<p class="text-sm font-medium text-amber-600 dark:text-amber-400">
										Step 2: Save Backup Codes
									</p>
									<p class="mt-1 text-xs text-muted-foreground">
										Store these safely - they're your recovery option
									</p>
									<div class="mt-3 grid grid-cols-2 gap-1 rounded bg-muted p-3 font-mono text-sm">
										{#each backupCodes as code}
											<span class="text-center">{code}</span>
										{/each}
									</div>
								</div>
							{/if}

							<!-- Verify TOTP -->
							<form method="POST" action="?/verifyTotp" use:enhance={handleVerifyTotp}>
								<div class="space-y-2">
									<Label for="totpCode">Step 3: Enter code from app</Label>
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
										oninput={(e: Event) => {
											const target = e.currentTarget as HTMLInputElement;
											const normalized = target.value.replace(/\D/g, '').slice(0, 6);
											target.value = normalized;
											totpCode = normalized;
										}}
										class="text-center text-2xl tracking-widest"
									/>
								</div>
								<Button type="submit" class="mt-4 w-full">Verify & Enable 2FA</Button>
							</form>
						</div>
					{:else if twoFactorEnabled}
						<!-- 2FA Enabled Status -->
						<div class="mb-4 flex items-center gap-3 rounded-lg bg-green-500/10 p-4">
							<ShieldCheck class="h-8 w-8 text-green-500" />
							<div>
								<p class="font-medium text-green-600 dark:text-green-400">2FA is enabled</p>
								<p class="text-sm text-muted-foreground">Your account is protected</p>
							</div>
						</div>

						<form method="POST" action="?/disable2FA" use:enhance={handle2FADisable}>
							<input
								type="hidden"
								name="username"
								value={data.user.email}
								autocomplete="username"
								readonly
							/>
							<div class="space-y-2">
								<Label for="disablePassword">Password to disable 2FA</Label>
								<div class="relative">
									<Input
										id="disablePassword"
										name="password"
										type={show2FAPassword ? 'text' : 'password'}
										autocomplete="current-password"
										placeholder="Enter password"
										required
										class="pr-10"
									/>
									<button
										type="button"
										class="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
										onclick={() => (show2FAPassword = !show2FAPassword)}
										aria-label={show2FAPassword ? 'Hide password' : 'Show password'}
									>
										{#if show2FAPassword}
											<EyeOff class="h-4 w-4" />
										{:else}
											<Eye class="h-4 w-4" />
										{/if}
									</button>
								</div>
							</div>
							<Button type="submit" variant="destructive" class="mt-4 w-full">Disable 2FA</Button>
						</form>
					{:else}
						<!-- Enable 2FA -->
						<div class="mb-4 rounded-lg border bg-muted/50 p-4">
							<div class="flex items-start gap-3">
								<Shield class="mt-0.5 h-5 w-5 text-muted-foreground" />
								<div>
									<p class="font-medium">Add extra security</p>
									<p class="mt-1 text-sm text-muted-foreground">
										Two-factor authentication adds a second layer of protection to your account
										using your phone.
									</p>
								</div>
							</div>
						</div>

						<form method="POST" action="?/enable2FA" use:enhance={handle2FAEnable}>
							<input
								type="hidden"
								name="username"
								value={data.user.email}
								autocomplete="username"
								readonly
							/>
							<div class="space-y-2">
								<Label for="enablePassword">Password to enable 2FA</Label>
								<div class="relative">
									<Input
										id="enablePassword"
										name="password"
										type={show2FAPassword ? 'text' : 'password'}
										autocomplete="current-password"
										placeholder="Enter password"
										required
										class="pr-10"
									/>
									<button
										type="button"
										class="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
										onclick={() => (show2FAPassword = !show2FAPassword)}
										aria-label={show2FAPassword ? 'Hide password' : 'Show password'}
									>
										{#if show2FAPassword}
											<EyeOff class="h-4 w-4" />
										{:else}
											<Eye class="h-4 w-4" />
										{/if}
									</button>
								</div>
							</div>
							<Button type="submit" class="mt-4 w-full">Enable 2FA</Button>
						</form>
					{/if}
				</TabsContent>
			</Tabs>
		</CardContent>
	</Card>
</div>
