<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { onMount } from 'svelte';

	let formElement: HTMLFormElement;

	onMount(() => {
		// Auto-submit the form when page loads
		setTimeout(() => {
			formElement.requestSubmit();
		}, 100);
	});
</script>

<div class="flex min-h-screen items-center justify-center p-4">
	<Card class="w-full max-w-md">
		<CardHeader class="space-y-1">
			<CardTitle class="text-2xl font-bold">Logout</CardTitle>
			<CardDescription>Logging you out...</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<!-- Auto-submit form on mount -->
			<form use:enhance method="POST" bind:this={formElement} class="hidden">
				<button type="submit">Logout</button>
			</form>
		</CardContent>
	</Card>
</div>
