<script lang="ts">
	import { cn } from '$lib/utils';
	import type { PromptVersion } from '$lib/stores/prompts.svelte';
	import { Card } from '$lib/components/ui/card';
	import { dateFormatStore } from '$lib/stores/date-format.svelte';
	import { formatDateString } from '$lib/utils/date';

	interface Props {
		versions: PromptVersion[];
		selectedVersionId?: number | null;
		currentVersionId?: number | null;
		onversionselect?: (version: PromptVersion) => void;
		class?: string;
	}

	let {
		versions,
		selectedVersionId = null,
		currentVersionId = null,
		onversionselect,
		class: className = ''
	}: Props = $props();

	// Format date with time using current setting
	function formatDate(date: Date | string): string {
		const d = new Date(date);
		return d.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Get change type badge color
	function getChangeTypeColor(changeType: string): string {
		const colors: Record<string, string> = {
			major: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
			minor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
			patch: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
		};
		return colors[changeType] || colors.patch;
	}

	// Get change type icon
	function getChangeTypeIcon(changeType: string): string {
		const icons: Record<string, string> = {
			major: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
			minor: 'M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4',
			patch: 'M5 12h14'
		};
		return icons[changeType] || icons.patch;
	}

	// Check if a version is the current (latest) version
	function isCurrentVersion(version: PromptVersion): boolean {
		return currentVersionId !== null && version.id === currentVersionId;
	}

	// Handle version selection
	function handleVersionClick(version: PromptVersion): void {
		onversionselect?.(version);
	}

	function handleKeyDown(e: KeyboardEvent, version: PromptVersion): void {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleVersionClick(version);
		}
	}

	function handleCardKeyDown(version: PromptVersion, e: KeyboardEvent): void {
		handleKeyDown(e, version);
	}
</script>

<div class={cn('flex flex-col', className)}>
	{#if versions.length === 0}
		<div class="flex flex-col items-center justify-center py-8 text-center">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="48"
				height="48"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="mb-3 text-muted-foreground"
			>
				<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
				<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
			</svg>
			<p class="text-sm text-muted-foreground">No versions yet</p>
			<p class="mt-1 text-xs text-muted-foreground">
				Create the first version to start tracking changes
			</p>
		</div>
	{:else}
		<div class="relative">
			<!-- Timeline line -->
			<div class="absolute top-3 bottom-3 left-4 w-0.5 bg-border" aria-hidden="true"></div>

			<!-- Version items -->
			<ul class="space-y-4" role="list" aria-label="Version history">
				{#each versions as version, index (version.id)}
					<li class="relative pl-10">
						<!-- Timeline dot -->
						<div
							class={cn(
								'absolute top-3 left-2 h-4 w-4 rounded-full border-2 transition-all duration-200',
								isCurrentVersion(version)
									? 'border-primary bg-primary ring-4 ring-primary/20'
									: 'border-muted-foreground/30 bg-background'
							)}
							aria-hidden="true"
						></div>

						<!-- Version card -->
						<Card
							class={cn(
								'cursor-pointer transition-all duration-200',
								'hover:border-primary/50 hover:shadow-md',
								selectedVersionId === version.id ? 'border-primary ring-2 ring-primary' : '',
								isCurrentVersion(version) ? 'border-primary/30' : ''
							)}
							onclick={() => handleVersionClick(version)}
							role="button"
							tabindex="0"
							aria-pressed={selectedVersionId === version.id}
							aria-label={`Version ${version.version}${isCurrentVersion(version) ? ' (current)' : ''}`}
							onkeydown={handleCardKeyDown.bind(null, version)}
						>
							<div class="p-4">
								<!-- Header: Version number and change type -->
								<div class="mb-2 flex items-start justify-between gap-3">
									<div class="flex items-center gap-2">
										<span class="font-mono text-lg font-semibold">v{version.version}</span>
										{#if isCurrentVersion(version)}
											<span
												class="inline-flex items-center rounded bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground"
											>
												Current
											</span>
										{/if}
									</div>
									<span
										class={cn(
											'inline-flex shrink-0 items-center rounded px-2 py-0.5 text-xs font-medium capitalize',
											getChangeTypeColor(version.changeType)
										)}
									>
										{version.changeType}
									</span>
								</div>

								<!-- Change notes -->
								{#if version.changeNotes}
									<p class="mb-3 line-clamp-2 text-sm text-muted-foreground">
										{version.changeNotes}
									</p>
								{/if}

								<!-- Footer: Date and author -->
								<div
									class="flex items-center justify-between border-t pt-2 text-xs text-muted-foreground"
								>
									<span class="flex items-center gap-1.5">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="12"
											height="12"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
											<line x1="16" y1="2" x2="16" y2="6" />
											<line x1="8" y1="2" x2="8" y2="6" />
											<line x1="3" y1="10" x2="21" y2="10" />
										</svg>
										{formatDate(version.createdAt)}
									</span>
									<span class="flex items-center gap-1.5">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="12"
											height="12"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
											<circle cx="12" cy="7" r="4" />
										</svg>
										{version.createdBy}
									</span>
								</div>
							</div>
						</Card>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
