<!--
  OverrideModal — prompt/version selection modal for overriding an agent's default prompt.
  Extracted from council-review-panel.svelte.
-->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { X, Search, Loader2, CheckCircle } from 'lucide-svelte';
	import type { PromptItem, PromptVersion } from './council-types';

	interface Props {
		/** Whether the modal is visible */
		open: boolean;
		/** Agent name being overridden */
		agentName: string;
		/** List of available prompts */
		prompts: PromptItem[];
		/** Whether prompts are loading */
		loading: boolean;
		/** Search query */
		searchQuery: string;
		/** Filtered prompts (derived from searchQuery) */
		filteredPrompts: PromptItem[];
		/** Currently expanded prompt ID */
		expandedPromptId: number | null;
		/** Currently selected override */
		selectedOverride: { promptId: number; versionId?: number } | null;
		/** Whether versions are loading */
		versionsLoading: boolean;
		/** List of versions for the expanded prompt */
		versions: PromptVersion[];
		/** Close the modal */
		onclose: () => void;
		/** Apply the override selection */
		onapply: () => void;
		/** Update search query */
		onsearch: (query: string) => void;
		/** Select a prompt (latest version) */
		onselectprompt: (promptId: number) => void;
		/** Select a specific version */
		onselectversion: (promptId: number, versionId: number) => void;
		/** Toggle prompt expand to show versions */
		ontoggleexpand: (promptId: number) => void;
	}

	let {
		open,
		agentName,
		prompts,
		loading,
		searchQuery,
		filteredPrompts,
		expandedPromptId,
		selectedOverride,
		versionsLoading,
		versions,
		onclose,
		onapply,
		onsearch,
		onselectprompt,
		onselectversion,
		ontoggleexpand
	}: Props = $props();
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="override-modal-title"
	>
		<div class="w-full max-w-md rounded-lg border bg-background p-4 shadow-lg">
			<!-- Modal header -->
			<div class="mb-4 flex items-center justify-between">
				<h3 id="override-modal-title" class="font-semibold">
					Override Prompt for {agentName}
				</h3>
				<button
					type="button"
					class="rounded p-1 hover:bg-muted"
					onclick={onclose}
					aria-label="Close"
				>
					<X class="h-4 w-4" />
				</button>
			</div>

			<!-- Search -->
			<div class="relative mb-3">
				<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<input
					type="text"
					value={searchQuery}
					oninput={(e) => onsearch(e.currentTarget.value)}
					placeholder="Search prompts..."
					class="w-full rounded-md border bg-background py-2 pr-3 pl-9 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
				/>
			</div>

			<!-- Prompts list -->
			<div class="max-h-80 overflow-y-auto rounded border">
				{#if loading}
					<div class="flex items-center justify-center p-4 text-muted-foreground">
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						Loading prompts...
					</div>
				{:else if filteredPrompts.length === 0}
					<div class="p-4 text-center text-muted-foreground">
						{#if searchQuery}
							No prompts match "{searchQuery}"
						{:else}
							No prompts available
						{/if}
					</div>
				{:else}
					{#each filteredPrompts as prompt (prompt.id)}
						{@const isExpanded = expandedPromptId === prompt.id}
						{@const isSelected =
							selectedOverride?.promptId === prompt.id && !selectedOverride.versionId}
						<div class="border-b last:border-b-0">
							<!-- Prompt row -->
							<div class="flex items-center">
								<button
									type="button"
									class="flex-1 px-3 py-2 text-left text-sm hover:bg-muted {isSelected
										? 'bg-primary/10 font-medium'
										: ''}"
									onclick={() => onselectprompt(prompt.id)}
								>
									<span class="flex items-center justify-between">
										<span>{prompt.title}</span>
										<span class="flex items-center gap-1">
											{#if isSelected}
												<CheckCircle class="h-4 w-4 text-primary" />
											{/if}
											<span class="text-[10px] text-muted-foreground">(latest)</span>
										</span>
									</span>
								</button>
								<!-- Expand button -->
								<button
									type="button"
									class="px-2 py-2 text-muted-foreground hover:bg-muted"
									onclick={() => ontoggleexpand(prompt.id)}
									title={isExpanded ? 'Collapse versions' : 'Show versions'}
								>
									<svg
										class="h-4 w-4 transition-transform {isExpanded ? 'rotate-180' : ''}"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
									>
										<path d="M6 9l6 6 6-6" />
									</svg>
								</button>
							</div>
							<!-- Versions list (expandable) -->
							{#if isExpanded}
								<div class="border-t bg-muted/30">
									{#if versionsLoading}
										<div
											class="flex items-center justify-center p-2 text-xs text-muted-foreground"
										>
											<Loader2 class="mr-1 h-3 w-3 animate-spin" />
											Loading versions...
										</div>
									{:else if versions.length === 0}
										<div class="p-2 text-center text-xs text-muted-foreground">
											No versions found
										</div>
									{:else}
										{#each versions as version (version.id)}
											{@const isVersionSelected =
												selectedOverride?.promptId === prompt.id &&
												selectedOverride.versionId === version.id}
											<button
												type="button"
												class="w-full px-3 py-1.5 pr-4 text-left text-xs hover:bg-muted {isVersionSelected
													? 'bg-primary/10 font-medium'
													: ''}"
												onclick={() => onselectversion(prompt.id, version.id)}
											>
												<span class="flex items-center justify-between">
													<span>
														<span class="font-mono text-muted-foreground">{version.version}</span>
														{#if version.changeNotes}
															<span class="ml-2 text-muted-foreground"
																>- {version.changeNotes}</span
															>
														{/if}
													</span>
													{#if isVersionSelected}
														<CheckCircle class="h-3 w-3 text-primary" />
													{/if}
												</span>
											</button>
										{/each}
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				{/if}
			</div>

			<!-- Actions -->
			<div class="mt-4 flex justify-end gap-2">
				<Button variant="outline" size="sm" onclick={onclose}>Cancel</Button>
				<Button size="sm" onclick={onapply}>
					{selectedOverride ? 'Apply Override' : 'Use Default'}
				</Button>
			</div>

			<!-- Info -->
			<p class="mt-2 text-center text-[10px] text-muted-foreground">
				{#if selectedOverride?.versionId}
					Selected specific version. Click prompt title for latest.
				{:else if selectedOverride}
					Using latest version. Expand to select specific version.
				{:else}
					Select a prompt to override the agent's default.
				{/if}
			</p>
		</div>
	</div>
{/if}
