<script lang="ts">
	import { page } from '$app/stores';
	import { cn } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';

	interface Props {
		open?: boolean;
		onclose?: () => void;
	}

	let { open = $bindable(false), onclose }: Props = $props();

	const navItems = [
		{ href: '/prompts', label: 'Prompts', icon: 'prompts' },
		{ href: '/analytics', label: 'Analytics', icon: 'analytics' },
		{ href: '/admin', label: 'Settings', icon: 'admin' }
	];

	function isActive(href: string, currentPath: string): boolean {
		return currentPath.startsWith(href);
	}

	function close() {
		open = false;
		onclose?.();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			close();
		}
	}

	const icons: Record<string, string> = {
		prompts: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>`,
		analytics: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>`,
		admin: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m9-9h-6m-6 0H3m15.364 6.364l-4.243 4.243M9.879 9.879L5.636 5.636m12.728 12.728l-4.243-4.243M9.879 14.121l-4.243 4.243"/></svg>`
	};
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Backdrop -->
{#if open}
	<div
		class="fixed inset-0 z-40 bg-black/50 md:hidden"
		role="button"
		tabindex="-1"
		onclick={close}
		onkeydown={(e) => e.key === 'Enter' && close()}
		aria-label="Close navigation menu"
	></div>
{/if}

<!-- Slide-out panel -->
<div
	class={cn(
		'fixed inset-y-0 left-0 z-50 w-64 border-r bg-background transition-transform duration-300 ease-in-out md:hidden',
		open ? 'translate-x-0' : '-translate-x-full'
	)}
	role="navigation"
	aria-label="Mobile navigation"
>
	<div class="flex h-full flex-col">
		<!-- Header -->
		<div class="flex h-16 items-center justify-between border-b px-4">
			<a href="/" class="flex items-center gap-2 font-semibold" onclick={close}>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
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
				<span>Prompt Wallet</span>
			</a>
			<Button variant="ghost" size="icon" onclick={close} aria-label="Close menu">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="h-5 w-5"
				>
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</Button>
		</div>

		<!-- Navigation links -->
		<nav class="flex-1 space-y-1 p-4">
			{#each navItems as item}
				{@const active = isActive(item.href, $page.url.pathname)}
				<Button
					variant={active ? 'secondary' : 'ghost'}
					class={cn(
						'w-full justify-start gap-2',
						active ? '' : 'text-muted-foreground'
					)}
					href={item.href}
					onclick={close}
				>
					{@html icons[item.icon]}
					{item.label}
				</Button>
			{/each}
		</nav>

		<!-- Footer -->
		<div class="border-t p-4">
			<p class="text-xs text-muted-foreground text-center">Prompt Wallet v1.0</p>
		</div>
	</div>
</div>
