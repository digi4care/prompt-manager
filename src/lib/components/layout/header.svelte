<script lang="ts">
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { cn } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';
	import { Menu, Sun, Moon, X, LogIn, LogOut, UserCircle } from 'lucide-svelte';
	import { auth } from '$lib/auth.svelte';

	interface Props {
		onMenuToggle?: () => void;
		class?: string;
		isAuthenticated?: boolean;
	}

	let { onMenuToggle, class: className = '', isAuthenticated = false }: Props = $props();

	// Use server-side auth as primary, fallback to client-side auth for immediate feedback after login
	let effectiveIsAuthenticated = $derived(isAuthenticated || auth.isAuthenticated);

	// Initialize isDark from DOM (synced via app.html for FOUC prevention)
	let isDark = $state(false);
	let mobileNavOpen = $state(false);

	interface NavItem {
		href: string;
		label: string;
	}

	const navItems: NavItem[] = [
		{ href: '/prompts', label: 'Prompts' },
		{ href: '/snippets', label: 'Snippets' },
		{ href: '/analytics', label: 'Analytics' },
		{ href: '/settings', label: 'Settings' }
	];

	// Sync isDark with DOM on mount (Svelte 5 pattern)
	$effect(() => {
		if (browser) {
			isDark = document.documentElement.classList.contains('dark');
		}
	});

	// Dev-only test page link
	const testNavItem: NavItem = {
		href: '/test',
		label: 'Test UI'
	};

	// Conditionally add test link in development
	const allNavItems: NavItem[] = import.meta.env.DEV ? [...navItems, testNavItem] : navItems;

	// Helper to check if a route is active
	function isActive(href: string, currentPath: string): boolean {
		return currentPath.startsWith(href);
	}

	function toggleTheme() {
		if (!browser) return;
		isDark = !isDark;
		const html = document.documentElement;
		if (isDark) {
			html.classList.add('dark');
			localStorage.setItem('theme', 'dark');
		} else {
			html.classList.remove('dark');
			localStorage.setItem('theme', 'light');
		}
	}

	function toggleMobileMenu() {
		mobileNavOpen = !mobileNavOpen;
		onMenuToggle?.();
	}

	// Close mobile nav when route changes
	$effect(() => {
		// Track pathname changes
		const path = $page.url.pathname;
		if (mobileNavOpen) {
			mobileNavOpen = false;
		}
	});

	$effect(() => {
		if (typeof window === 'undefined') return;
		if (!mobileNavOpen) return;

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') mobileNavOpen = false;
		};

		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	});
</script>

<header
	class={cn(
		'sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
		className
	)}
>
	<div class="container mx-auto flex h-16 items-center justify-between px-4">
		<!-- Left side: Branding -->
		<div>
			<!-- App branding -->
			<a href="/" class="flex items-center gap-2 text-lg font-semibold">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="28"
					height="28"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="text-primary"
				>
					<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
				</svg>
				<span class="hidden sm:inline">Prompt Wallet</span>
			</a>
		</div>

		<!-- Right side: Desktop Nav + Mobile menu + Theme toggle -->
		<div class="flex items-center gap-4">
			<!-- Desktop Navigation (only when authenticated) -->
			{#if effectiveIsAuthenticated}
				<nav class="flex items-center gap-1">
					{#each allNavItems as item}
						{@const active = isActive(item.href, $page.url.pathname)}
						<a
							href={item.href}
							class={cn(
								'inline-flex min-h-[44px] items-center rounded-md px-4 py-2.5 text-sm font-medium transition-colors',
								active
									? 'bg-primary text-primary-foreground'
									: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring'
							)}
						>
							{item.label}
						</a>
					{/each}
				</nav>
			{/if}

			<!-- Mobile menu + Theme toggle -->
			<div class="flex items-center gap-2">
				<!-- Mobile menu button -->
				<button
					type="button"
					onclick={toggleMobileMenu}
					aria-label="Toggle menu"
					aria-expanded={mobileNavOpen}
					aria-controls="mobile-nav"
					class="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-md text-sm font-medium whitespace-nowrap ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 md:hidden"
				>
					{#if mobileNavOpen}
						<X class="h-5 w-5" />
					{:else}
						<Menu class="h-5 w-5" />
					{/if}
				</button>

				<!-- Theme Toggle Button - SSR ready, no FOUC -->
				<Button
					variant="ghost"
					size="icon"
					onclick={toggleTheme}
					aria-label="Toggle theme"
					title="Toggle dark/light mode"
				>
					{#if isDark}
						<Moon class="h-[1.2rem] w-[1.2rem]" />
					{:else}
						<Sun class="h-[1.2rem] w-[1.2rem]" />
					{/if}
				</Button>

				<!-- Login/Logout Button - SSR ready, no FOUC -->
				{#if effectiveIsAuthenticated}
					<div class="flex items-center gap-1">
						<Button
							variant="ghost"
							size="icon"
							href="/admin/profile"
							aria-label="Profile"
							title="Profile"
						>
							<UserCircle class="h-[1.2rem] w-[1.2rem]" />
						</Button>
						<form method="POST" action="/logout">
							<Button variant="ghost" size="icon" type="submit" aria-label="Logout" title="Logout">
								<LogOut class="h-[1.2rem] w-[1.2rem]" />
							</Button>
						</form>
					</div>
				{:else if $page.url.pathname !== '/login'}
					<Button variant="ghost" size="icon" href="/login" aria-label="Login" title="Login">
						<LogIn class="h-[1.2rem] w-[1.2rem]" />
					</Button>
				{/if}
			</div>
		</div>

		<!-- Mobile Navigation (slide-out, only when authenticated) -->
		{#if effectiveIsAuthenticated}
			<!-- Backdrop -->
			{#if mobileNavOpen}
				<div
					class="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm md:hidden"
					onclick={() => (mobileNavOpen = false)}
					onkeydown={(e) => e.key === 'Escape' && (mobileNavOpen = false)}
					role="button"
					tabindex="-1"
					aria-label="Close menu"
				></div>
			{/if}

			<!-- Mobile Nav Panel -->
			<nav
				id="mobile-nav"
				class={cn(
					'fixed inset-x-0 top-16 z-40 border-t bg-background p-4 transition-all duration-300 ease-in-out md:hidden',
					mobileNavOpen
						? 'translate-y-0 opacity-100'
						: 'pointer-events-none -translate-y-4 opacity-0'
				)}
				aria-label="Mobile navigation"
			>
				<div class="space-y-1">
					{#each allNavItems as item}
						{@const active = isActive(item.href, $page.url.pathname)}
						<a
							href={item.href}
							onclick={() => (mobileNavOpen = false)}
							class={cn(
								'flex min-h-[44px] w-full items-center rounded-md px-4 py-3 font-medium text-base transition-all duration-200',
								active
									? 'bg-primary text-primary-foreground'
									: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:text-foreground'
							)}
						>
							{item.label}
						</a>
					{/each}
				</div>
			</nav>
		{/if}
	</div>
</header>
