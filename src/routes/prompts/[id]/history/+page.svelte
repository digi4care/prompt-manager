<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { ExecutionHistory, ExecutionLogDetail } from '$lib/components/prompts';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { ChevronLeft, ArrowLeft } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages.js';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Selected log for detail view
	let selectedLogId = $state<number | null>(null);

	// Check if we came via shallow routing (has state) or direct navigation
	const isShallowNavigation = $derived(!!(page.state as any)?.fromDetail);

	// Handle back navigation
	function handleBack() {
		// Check if there's history to go back to
		if (isShallowNavigation) {
			// Go back to the detail page (pop the state)
			history.back();
		} else {
			// Direct navigation - go to the prompt detail page
			goto(`/prompts/${data.prompt.id}`);
		}
	}

	// Handle log selection
	function handleLogSelect(log: { id: number }) {
		selectedLogId = log.id;
	}
</script>

<svelte:head>
	<title>
		{m['prompts.history']()} - {data.prompt.title} | Prompt Management
	</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header with back button -->
	<header class="flex items-center gap-4">
		<Button variant="ghost" size="icon" onclick={handleBack} aria-label={m['common.back']()}>
			<ChevronLeft class="h-5 w-5" />
		</Button>
		<div class="flex-1">
			<h1 class="text-xl font-bold">{data.prompt.title}</h1>
			<p class="text-sm text-muted-foreground">{m['prompts.history']()}</p>
		</div>
	</header>

	<!-- History content -->
	<div class="grid gap-6 lg:grid-cols-2">
		<!-- History list -->
		<section class="rounded-lg border bg-card p-4">
			<h2 class="mb-4 text-sm font-semibold">{m['prompts.history']()}</h2>
			<ExecutionHistory promptId={data.prompt.id} onselect={handleLogSelect} {selectedLogId} />
		</section>

		<!-- Log detail -->
		<section>
			{#if selectedLogId}
				<ExecutionLogDetail
					logId={selectedLogId}
					promptId={data.prompt.id}
					onclose={() => (selectedLogId = null)}
				/>
			{:else}
				<div
					class="flex h-full min-h-[300px] items-center justify-center rounded-lg border border-dashed bg-muted/30 p-8 text-center"
				>
					<div>
						<ArrowLeft class="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
						<p class="text-sm text-muted-foreground">Select an execution to view details</p>
					</div>
				</div>
			{/if}
		</section>
	</div>
</div>
