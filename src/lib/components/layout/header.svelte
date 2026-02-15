<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { cn } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';
	import { Menu, Sun, Moon, X, LogIn, LogOut, UserCircle } from 'lucide-svelte';

	interface Props {
		onMenuToggle?: () => void;
		class?: string;
	}

	let { onMenuToggle, class: className = '' }: Props = $props();

	let isDark = $state(false);
	let navMounted = $state(false);
	let mobileNavOpen = $state(false);

	interface NavItem {
		href: string;
		label: string;
	}

	const navItems: NavItem[] = [
		{ href: '/prompts', label: 'Prompts' },
		{ href: '/analytics', label: 'Analytics' },
		{ href: '/admin', label: 'Settings' }
	];

	// Suppress hydration by only showing nav on client mount
	let mounted = $state(false);

	onMount(() => {
		mounted = true;
		isDark = document.documentElement.classList.contains('dark');
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
			{#if $page.data.isAuthenticated}
				<nav class="hidden items-center gap-1 md:flex">
					{#each allNavItems as item}
						{@const active = isActive(item.href, $page.url.pathname)}
						<a
							href={item.href}
							class={cn(
								'inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
								active
									? 'bg-primary text-primary-foreground'
									: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:text-foreground'
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
					class="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-sm font-medium whitespace-nowrap ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 md:hidden"
				>
					{#if mobileNavOpen}
						<X class="h-5 w-5" />
					{:else}
						<Menu class="h-5 w-5" />
					{/if}
				</button>

				<!-- Theme Toggle Button -->
				{#if mounted}
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
				{/if}

				<!-- Login/Logout Button -->
				{#if mounted}
					{#if $page.data.isAuthenticated}
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
								<Button
									variant="ghost"
									size="icon"
									type="submit"
									aria-label="Logout"
									title="Logout"
								>
									<LogOut class="h-[1.2rem] w-[1.2rem]" />
								</Button>
							</form>
						</div>
					{:else if $page.url.pathname !== '/login'}
						<Button variant="ghost" size="icon" href="/login" aria-label="Login" title="Login">
							<LogIn class="h-[1.2rem] w-[1.2rem]" />
						</Button>
					{/if}
				{/if}
			</div>
		</div>

		<!-- Mobile Navigation (slide-out, only when authenticated) -->
		{#if mobileNavOpen && $page.data.isAuthenticated}
			<nav
				id="mobile-nav"
				class="space-y-1 border-t bg-background p-4 md:hidden"
				aria-label="Mobile navigation"
			>
				{#each allNavItems as item}
					{@const active = isActive(item.href, $page.url.pathname)}
					<a
						href={item.href}
						onclick={() => (mobileNavOpen = false)}
						class={cn(
							'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
							active
								? 'bg-primary text-primary-foreground'
								: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:text-foreground'
						)}
					>
						{item.label}
					</a>
				{/each}
			</nav>
		{/if}
	</div>
</header>
