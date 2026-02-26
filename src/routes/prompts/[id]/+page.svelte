<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import {
		PromptContentViewer,
		ExecutionPanel,
		ExecutionHistory,
		ExecutionLogDetail
	} from '$lib/components/prompts';
	import { VersionTimeline } from '$lib/components/versions';
	import { promptsStore } from '$lib/stores/prompts.svelte';
	import type { PromptVersion } from '$lib/stores/prompts.svelte';
	import { goto } from '$app/navigation';
	import { cn } from '$lib/utils';
	import { ChevronRight, Edit, Sparkles, Trash2, History, ChevronDown } from 'lucide-svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Get current version content
	let currentContent = $derived(data.currentVersion?.content || '');
	let currentVersionId = $derived(data.currentVersion?.id || null);

	// Selected version for viewing details
	let selectedVersion = $state<PromptVersion | null>(null);

	// Delete confirmation state
	let showDeleteConfirm = $state(false);
	let deleting = $state(false);
	let deleteError = $state('');

	// Execution history state
	let showHistory = $state(false);
	let selectedLogId = $state<number | null>(null);
	let showDetail = $state(false);

	// Format date for display
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

	// Handle version selection
	function handleVersionSelect(version: PromptVersion) {
		selectedVersion = version;
	}

	// Handle edit navigation - open edit page
	function handleEdit() {
		if (!data.prompt?.id) return;
		goto(`/prompts/${data.prompt.id}/edit`);
	}

	// Handle improve navigation - open edit page with improve button available
	function handleImprove() {
		if (!data.prompt?.id) return;
		goto(`/prompts/${data.prompt.id}/edit`);
	}

	// Handle delete confirmation
	function handleDeleteClick() {
		showDeleteConfirm = true;
	}

	// Handle actual delete
	async function handleDeleteConfirm() {
		if (deleting || !data.prompt?.id) return;

		deleting = true;
		deleteError = '';

		try {
			await promptsStore.deletePrompt(data.prompt.id);
			// Navigate back to prompts list after successful deletion
			goto('/prompts');
		} catch (err) {
			deleteError = err instanceof Error ? err.message : 'Failed to delete prompt';
			deleting = false;
			showDeleteConfirm = false;
		}
	}

	// Handle cancel delete
	function handleDeleteCancel() {
		showDeleteConfirm = false;
		deleteError = '';
	}

	// Version count
	let versionCount = $derived(data.versions.length);

	// Get last updated date
	let lastUpdated = $derived(new Date(data.prompt.updatedAt));

	// Handle keyboard shortcuts
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && showDeleteConfirm) {
			handleDeleteCancel();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>{data.meta.title} | Prompt Management</title>
	<meta name="description" content={data.meta.description} />
</svelte:head>

<div class="space-y-8" id="prompt-detail-section">
	<!-- Page Header -->
	<header class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
		<div class="flex-1 space-y-3">
			<!-- Breadcrumb -->
			<nav class="flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb">
				<a href="/prompts" class="transition-colors hover:text-foreground">Prompts</a>
				<ChevronRight size={14} />
				<span class="max-w-[200px] truncate font-medium text-foreground">{data.prompt.title}</span>
			</nav>

			<!-- Title -->
			<h1 class="text-2xl font-bold tracking-tight">{data.prompt.title}</h1>

			<!-- Description -->
			{#if data.prompt.description}
				<p class="text-sm leading-relaxed text-muted-foreground">{data.prompt.description}</p>
			{/if}

			<!-- Meta: version info inline -->
			<p class="text-xs text-muted-foreground">
				v{data.currentVersion?.version || 'N/A'} · {versionCount} version{versionCount !== 1
					? 's'
					: ''} · Updated {formatDate(lastUpdated)}{#if data.prompt.purpose}
					· <span class="capitalize">{data.prompt.purpose}</span>{/if}
			</p>

			<!-- Badges: LLM Providers + Tags grouped together -->
			{#if (data.prompt.llmProviders && data.prompt.llmProviders.length > 0) || (data.prompt.tags && data.prompt.tags.length > 0)}
				<div class="flex flex-wrap items-center gap-1.5">
					{#if data.prompt.llmProviders && data.prompt.llmProviders.length > 0}
						{#each data.prompt.llmProviders as provider}
							<span
								class="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium"
							>
								{provider}
							</span>
						{/each}
					{/if}
					{#if data.prompt.tags && data.prompt.tags.length > 0}
						{#each data.prompt.tags as tag}
							<span
								class="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
							>
								{tag}
							</span>
						{/each}
					{/if}
				</div>
			{/if}
		</div>

		<!-- Action Buttons -->
		<div class="flex items-center gap-2">
			<Button variant="default" onclick={handleEdit} class="gap-1.5">
				<Edit size={16} />
				Edit
			</Button>
			<Button variant="outline" onclick={handleImprove} class="gap-1.5">
				<Sparkles size={16} />
				Improve
			</Button>
			<Button
				variant="ghost"
				size="icon"
				onclick={handleDeleteClick}
				class="text-muted-foreground hover:text-destructive"
				aria-label="Delete prompt"
			>
				<Trash2 size={16} />
			</Button>
		</div>
	</header>

	<!-- Main Content -->
	<div class="grid gap-8 lg:grid-cols-3">
		<!-- Prompt Content -->
		<div class="space-y-6 lg:col-span-2">
			<!-- Current Version Content -->
			<section class="rounded-lg border bg-card">
				<div class="border-b p-4">
					<h2 class="font-semibold">Prompt Content</h2>
					<p class="mt-0.5 text-xs text-muted-foreground">v{data.currentVersion?.version}</p>
				</div>
				<div class="p-4">
					<PromptContentViewer content={currentContent} />
				</div>
			</section>

			<!-- Execution Panel -->
			<section class="rounded-lg border bg-card">
				<div class="border-b p-4">
					<h2 class="font-semibold">Execute Prompt</h2>
					<p class="mt-0.5 text-xs text-muted-foreground">Test this prompt with AI model</p>
				</div>
				<div class="p-4">
					{#if data.prompt?.id}
						<ExecutionPanel promptId={data.prompt.id} content={currentContent} />
					{:else}
						<p class="text-sm text-muted-foreground">Save prompt to enable execution</p>
					{/if}
				</div>
			</section>

			<!-- Execution History -->
			{#if data.prompt?.id}
				<div class="mt-6">
					<button
						class="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
						onclick={() => (showHistory = !showHistory)}
					>
						<History class="h-4 w-4" />
						Execution History
						<ChevronDown
							class={cn('h-4 w-4 transition-transform duration-200', showHistory && 'rotate-180')}
						/>
					</button>

					{#if showHistory}
						<div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
							<div class="rounded-lg border bg-card p-4">
								<h3 class="mb-2 text-xs font-medium text-muted-foreground">Recent Executions</h3>
								<ExecutionHistory
									promptId={data.prompt.id}
									onselect={(log) => {
										selectedLogId = log.id;
										showDetail = true;
									}}
									{selectedLogId}
								/>
							</div>
							{#if showDetail && selectedLogId}
								<ExecutionLogDetail
									logId={selectedLogId}
									promptId={data.prompt.id}
									onclose={() => {
										showDetail = false;
										selectedLogId = null;
									}}
								/>
							{:else}
								<div
									class="flex items-center justify-center rounded-lg border border-dashed bg-muted/30 p-8 text-sm text-muted-foreground"
								>
									Select an execution to view details
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/if}

			<!-- Selected Version Details -->
			{#if selectedVersion && selectedVersion.id !== currentVersionId}
				<div class="rounded-lg border bg-card">
					<div class="flex flex-col space-y-1.5 p-6">
						<h2 class="text-lg leading-none font-semibold tracking-tight">
							Version {selectedVersion.version} Details
						</h2>
						<p class="text-sm text-muted-foreground">Viewing historical version content</p>
					</div>
					<div class="p-6 pt-0">
						<PromptContentViewer content={selectedVersion.content} />
						{#if selectedVersion.changeNotes}
							<div class="mt-4 rounded-lg bg-muted/50 p-4">
								<h4 class="mb-2 font-semibold">Change Notes</h4>
								<p class="text-sm">{selectedVersion.changeNotes}</p>
							</div>
						{/if}
						<div class="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
							<span>Created by {selectedVersion.createdBy}</span>
							<span>•</span>
							<span>{formatDate(selectedVersion.createdAt)}</span>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Sidebar - Version Timeline -->
		<aside>
			<div class="rounded-lg border bg-card p-4">
				<h2 class="mb-1 text-sm font-semibold">Version History</h2>
				<p class="mb-4 text-xs text-muted-foreground">
					{versionCount} version{versionCount !== 1 ? 's' : ''}
				</p>
				<VersionTimeline
					versions={data.versions}
					{currentVersionId}
					selectedVersionId={selectedVersion?.id || null}
					onversionselect={handleVersionSelect}
					class="max-h-[500px] overflow-y-auto"
				/>
			</div>
		</aside>
	</div>
</div>

<!-- Delete Confirmation Dialog -->
{#if showDeleteConfirm}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-background/80"
		onclick={(e) => {
			if (e.target === e.currentTarget) handleDeleteCancel();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') handleDeleteCancel();
		}}
		tabindex="0"
		role="dialog"
		aria-modal="true"
	>
		<div class="mx-4 w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg">
			<h2 class="mb-2 text-lg font-semibold">Delete "{data.prompt.title}"?</h2>
			<p class="mb-6 text-sm text-muted-foreground">This action cannot be undone.</p>

			{#if deleteError}
				<div
					class="mb-4 rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
				>
					{deleteError}
				</div>
			{/if}

			<div class="flex justify-end gap-3">
				<Button variant="outline" onclick={handleDeleteCancel} disabled={deleting}>Cancel</Button>
				<Button variant="destructive" onclick={handleDeleteConfirm} loading={deleting}
					>Delete</Button
				>
			</div>
		</div>
	</div>
{/if}
