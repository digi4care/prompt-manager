<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Toaster } from '$lib/components/ui/toast';
	import { Header } from '$lib/components/layout';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="min-h-screen bg-background text-foreground">
	<!-- Header -->
	<div class="mx-auto max-w-[1440px]">
		<Header />
	</div>

	<!-- Main content -->
	<main class="mx-auto max-w-[1440px]">
		<div class="px-4 py-6">
			{@render children()}
		</div>
	</main>
</div>

<Toaster />
