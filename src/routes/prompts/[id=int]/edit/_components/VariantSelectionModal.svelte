<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { X, ChevronUp, ChevronDown } from 'lucide-svelte';
	import type { PromptEditController } from '$lib/composables/usePromptEdit.svelte';

	interface Props {
		controller: PromptEditController;
	}

	let { controller }: Props = $props();
</script>

{#if controller.showVariantModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
		role="dialog"
		aria-modal="true"
	>
		<div
			class="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border bg-card shadow-lg"
		>
			<!-- Modal Header -->
			<div class="flex items-center justify-between border-b p-6">
				<div>
					<h2 class="text-lg font-semibold">Select Improved Version</h2>
					<p class="text-sm text-muted-foreground">
						Click on a variant to expand and see the full content
					</p>
				</div>
				<button
					type="button"
					onclick={controller.handleCloseVariantModal}
					class="text-muted-foreground hover:text-foreground"
				>
					<X size={20} />
				</button>
			</div>

			<!-- Modal Body with Scrollable Content -->
			<div class="flex-1 overflow-y-auto p-6">
				<div class="space-y-4">
					{#each controller.variants as variant, idx}
						{@const isExpanded = controller.expandedVariants.has(idx)}
						<div class="rounded-lg border bg-card">
							<!-- Variant Header -->
							<button
								type="button"
								onclick={() => controller.toggleVariantExpanded(idx)}
								class="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50"
							>
								<div class="flex items-center gap-3">
									<span class="text-sm font-medium">Variant {idx + 1}</span>
									<span class="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
										{variant.changeType}
									</span>
									{#if variant.changeNotes}
										<span class="text-xs text-muted-foreground">
											{variant.changeNotes}
										</span>
									{/if}
								</div>
								<div class="flex items-center gap-2">
									{#if isExpanded}
										<ChevronUp size={16} class="text-muted-foreground" />
									{:else}
										<ChevronDown size={16} class="text-muted-foreground" />
									{/if}
								</div>
							</button>

							<!-- Variant Content (expandable) -->
							{#if isExpanded}
								<div class="border-t p-4">
									<pre
										class="overflow-x-auto rounded border bg-muted p-3 text-sm whitespace-pre-wrap">{variant.content}</pre>
									<div class="mt-3 flex justify-end">
										<Button size="sm" onclick={() => controller.handleSelectVariant(variant)}>
											Use This Variant
										</Button>
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<!-- Modal Footer -->
			<div class="flex justify-end gap-2 border-t bg-muted/30 p-4">
				<Button variant="outline" onclick={controller.handleCloseVariantModal}>Cancel</Button>
			</div>
		</div>
	</div>
{/if}
