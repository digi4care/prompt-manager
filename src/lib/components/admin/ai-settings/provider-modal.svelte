<script lang="ts">
	import { X, Search, Check, Link2, Unlink, KeyRound, ExternalLink } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import ProviderLogo from '$lib/components/ui/provider-logo.svelte';
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
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={handleClose}
	>
		<div
			bind:this={dialogElement}
			class="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border bg-background shadow-2xl"
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			onkeydown={handleDialogKeydown}
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header with better visual hierarchy -->
			<div class="border-b px-6 py-5">
				<div class="flex items-start justify-between">
					<div>
						<h2 class="text-xl font-bold">Providers</h2>
						<p class="mt-1 text-sm text-muted-foreground">
							{connectedProviders.length} connected of {providers.length}
						</p>
					</div>
					<button
						type="button"
						class="rounded-lg p-2 hover:bg-muted"
						onclick={handleClose}
						aria-label="Close"
					>
						<X class="size-5" />
					</button>
				</div>
			</div>

			<!-- Content with better spacing -->
			<div class="space-y-4 p-6">
				<!-- Search with icon -->
				<div class="relative">
					<Search
						class="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						type="text"
						bind:value={searchQuery}
						placeholder="Search providers..."
						class="pl-10"
					/>
				</div>

				<!-- Provider list with better whitespace -->
				<div class="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
					{#if filteredProviders.length === 0}
						<div class="rounded-lg bg-muted/20 px-4 py-8 text-center text-muted-foreground">
							No providers found
						</div>
					{:else}
						{#each filteredProviders as provider (provider.id)}
							{@const connected = isConnected(provider.id)}
							<div
								class="flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all {connected
									? 'border-primary bg-muted'
									: 'border-border hover:border-primary hover:bg-muted'}"
								onclick={() => handleToggle(provider.id)}
								onkeydown={(e) => e.key === 'Enter' && handleToggle(provider.id)}
								role="button"
								tabindex="0"
							>
								<div class="flex items-center gap-4">
									<div
										class="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-muted"
									>
										<ProviderLogo providerId={provider.id} class="h-6 w-6" />
									</div>
									<div>
										<div class="flex items-center gap-2">
											<span class="font-medium">{provider.name}</span>
											{#if connectedProviders.includes(provider.id)}
												<Badge variant="default" class="gap-1">
													<Check class="h-3 w-3" />
													Connected
												</Badge>
											{/if}
										</div>
										<div class="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
											<span class="font-mono">{provider.id}</span>
											{#if provider.models}
												<span class="text-muted-foreground/50">·</span>
												<span>{provider.models.length} models</span>
											{/if}
										</div>
									</div>
								</div>
								<div class="shrink-0">
									{#if isProcessing === provider.id}
										<span class="text-sm text-muted-foreground">Processing...</span>
									{:else if connected}
										<Button
											variant="ghost"
											size="sm"
											onclick={(e: MouseEvent) => {
												e.stopPropagation();
												handleToggle(provider.id);
											}}
											disabled={isProcessing !== null}
											class="gap-1 text-destructive hover:text-destructive"
										>
											<Unlink class="size-3" />
											Disconnect
										</Button>
									{:else}
										<Button
											size="sm"
											onclick={(e: MouseEvent) => {
												e.stopPropagation();
												handleToggle(provider.id);
											}}
											disabled={isProcessing !== null}
											class="gap-1"
										>
											<Link2 class="size-3" />
											Connect
										</Button>
									{/if}
								</div>
							</div>
						{/each}
					{/if}
				</div>
			</div>

			<!-- Footer -->
			<div class="border-t px-6 py-4">
				<Button
					variant="outline"
					onclick={handleClose}
					disabled={isProcessing !== null}
					class="w-full"
				>
					Close
				</Button>
			</div>
		</div>
	</div>
{/if}
