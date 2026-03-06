<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Toaster } from '$lib/components/ui/toast';
	import { Header } from '$lib/components/layout';
	import { auth } from '$lib/auth.svelte';
	import { browser } from '$app/environment';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();

	// Initialize auth on mount - this sets up BroadcastChannel and checks session
	$effect(() => {
		if (browser) {
			// Auth auto-initializes in constructor, just accessing it triggers setup
			console.log('[Auth] Initialized, authenticated:', auth.isAuthenticated);
		}
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="min-h-screen bg-background text-foreground">
	<!-- Header -->
	<div class="mx-auto max-w-[1440px]">
		<Header isAuthenticated={data.isAuthenticated} />
	</div>

	<!-- Main content -->
	<main class="mx-auto max-w-[1440px]">
		<div class="px-4 py-6">
			{@render children()}
		</div>
	</main>
</div>

<Toaster />
