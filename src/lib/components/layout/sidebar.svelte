<script lang="ts">
	import { page } from '$app/stores';
	import { cn } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';

	interface NavItem {
		href: string;
		label: string;
		icon: 'prompts' | 'analytics' | 'admin' | 'test';
	}

	const navItems: NavItem[] = [
		{
			href: '/prompts',
			label: 'Prompts',
			icon: 'prompts'
		},
		{
			href: '/analytics',
			label: 'Analytics',
			icon: 'analytics'
		},
		{
			href: '/admin',
			label: 'Settings',
			icon: 'admin'
		}
	];

	// Dev-only test page link (only shown in development)
	const testNavItem: NavItem = {
		href: '/test',
		label: 'Test UI',
		icon: 'test'
	};

	// Conditionally add test link in development
	const allNavItems: NavItem[] = import.meta.env.DEV || process.env.NODE_ENV === 'development'
		? [...navItems, testNavItem]
		: navItems;

	// Helper to check if a route is active
	function isActive(href: string, currentPath: string): boolean {
		return currentPath.startsWith(href);
	}

	// Icon components as simple inline SVGs
	const icons: Record<string, any> = {
		prompts: {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>`
		},
		analytics: {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>`
		},
		admin: {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m9-9h-6m-6 0H3m15.364 6.364l-4.243 4.243M9.879 9.879L5.636 5.636m12.728 12.728l-4.243-4.243M9.879 14.121l-4.243 4.243"/></svg>`
		},
		test: {
			svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`
		}
	};
</script>

<aside
	class="hidden w-64 flex-shrink-0 border-r bg-background md:block sticky top-0 self-start h-[calc(100vh-4rem)]"
>
	<div class="flex h-full flex-col">
		<!-- Navigation section -->
		<nav class="flex-1 space-y-1 p-4">
			{#each allNavItems as item}
				{@const active = isActive(item.href, $page.url.pathname)}
				<Button
					variant={active ? 'secondary' : 'ghost'}
					class={cn(
						'w-full justify-start gap-2',
						active ? '' : 'text-muted-foreground'
					)}
					href={item.href}
				>
					{#if icons[item.icon]}
						{@html icons[item.icon].svg}
					{/if}
					{item.label}
				</Button>
			{/each}
		</nav>

		<!-- Footer with version info -->
		<div class="border-t p-4">
			<p class="text-xs text-muted-foreground text-center">
				Prompt Wallet v1.0
			</p>
		</div>
	</div>
</aside>
