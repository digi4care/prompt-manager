<script lang="ts">
	import { X, Search, Check, Link, Unlink } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import type { ProviderInfo } from '$lib/server/services/opencode.service';

	interface Props {
		open?: boolean;
		providers?: ProviderInfo[];
		connectedProviders?: string[];
		onConnect: (providerId: string) => Promise<void>;
		onDisconnect: (providerId: string) => Promise<void>;
		onClose: () => void;
	}

	let {
		open = false,
		providers = [],
		connectedProviders = [],
		onConnect,
		onDisconnect,
		onClose
	}: Props = $props();

	// Local state
	let searchQuery = $state('');
	let isProcessing = $state<string | null>(null);
	let dialogElement = $state<HTMLDivElement | null>(null);

	// Derived
	let filteredProviders = $derived.by(() => {
		const query = searchQuery.toLowerCase().trim();
		if (!query) return providers;
		return providers.filter(
			(p) =>
				p.id.toLowerCase().includes(query) ||
				p.name.toLowerCase().includes(query) ||
				(p.description?.toLowerCase().includes(query) ?? false)
		);
	});

	function isConnected(providerId: string): boolean {
		return connectedProviders.includes(providerId);
	}

	async function handleToggle(providerId: string) {
		isProcessing = providerId;
		try {
			if (isConnected(providerId)) {
				await onDisconnect(providerId);
			} else {
				await onConnect(providerId);
			}
		} finally {
			isProcessing = null;
		}
	}

	function handleClose() {
		if (!isProcessing) {
			onClose();
		}
	}

	function handleDialogKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			handleClose();
		}
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
		onclick={handleClose}
	>
		<div
			bind:this={dialogElement}
			class="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border bg-background shadow-xl"
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			onkeydown={handleDialogKeydown}
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b px-4 py-3">
				<div>
					<h2 class="text-lg font-semibold">Providers</h2>
					<p class="text-sm text-muted-foreground">
						{connectedProviders.length} verbonden van {providers.length}
					</p>
				</div>
				<button
					type="button"
					class="cursor-pointer rounded-md p-1.5 hover:bg-muted"
					onclick={handleClose}
					aria-label="Sluiten"
				>
					<X class="size-5" />
				</button>
			</div>

			<!-- Content -->
			<div class="space-y-4 p-4">
				<!-- Search -->
				<div class="relative">
					<Search
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Zoek provider..."
						class="w-full rounded-md border bg-background py-2 pr-3 pl-10 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
					/>
				</div>

				<!-- Provider list -->
				<div class="max-h-[50vh] overflow-y-auto">
					{#if filteredProviders.length === 0}
						<div class="rounded-md px-3 py-4 text-center text-sm text-muted-foreground">
							Geen providers gevonden
						</div>
					{:else}
						<dl class="space-y-2">
							{#each filteredProviders as provider (provider.id)}
								<div
									class="flex cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2 transition-colors {isConnected(
										provider.id
									)
										? 'border-primary/50 bg-primary/5'
										: 'border-border hover:bg-muted/50'}"
									onclick={() => handleToggle(provider.id)}
									onkeydown={(e) => e.key === 'Enter' && handleToggle(provider.id)}
									role="button"
									tabindex="0"
								>
									<dt class="min-w-0 flex-1">
										<div class="flex items-center gap-2">
											<span class="font-medium">{provider.name}</span>
											{#if isConnected(provider.id)}
												<span
													class="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary"
												>
													Verbonden
												</span>
											{/if}
										</div>
										<span class="font-mono text-[11px] text-muted-foreground">
											{provider.id}
										</span>
										{#if provider.models}
											<span class="ml-2 text-xs text-muted-foreground">
												{provider.models.length} models
											</span>
										{/if}
									</dt>
									<dd class="shrink-0">
										{#if isProcessing === provider.id}
											<span class="text-xs text-muted-foreground">...</span>
										{:else if isConnected(provider.id)}
											<button
												onclick={(e) => {
													e.stopPropagation();
													handleToggle(provider.id);
												}}
												class="inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/20"
												disabled={isProcessing !== null}
											>
												<Unlink class="size-3" />
												Disconnect
											</button>
										{:else}
											<button
												onclick={(e) => {
													e.stopPropagation();
													handleToggle(provider.id);
												}}
												class="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
												disabled={isProcessing !== null}
											>
												<Link class="size-3" />
												Connect
											</button>
										{/if}
									</dd>
								</div>
							{/each}
						</dl>
					{/if}
				</div>
			</div>

			<!-- Footer -->
			<div class="flex justify-end gap-2 border-t px-4 py-3">
				<Button variant="outline" onclick={handleClose} disabled={isProcessing !== null}
					>Sluiten</Button
				>
			</div>
		</div>
	</div>
{/if}
