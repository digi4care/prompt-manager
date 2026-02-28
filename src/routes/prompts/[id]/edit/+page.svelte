<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { PromptEditor, PromptMetadata, TestRunnerPanel } from '$lib/components/prompts';
	import { SnippetPicker } from '$lib/components/snippets';
	import { Textarea } from '$lib/components/ui/textarea';
	import { promptsStore } from '$lib/stores/prompts.svelte';
	import { goto } from '$app/navigation';
	import {
		ChevronRight,
		Save,
		Sparkles,
		X,
		ChevronDown,
		ChevronUp,
		Keyboard,
		CheckCircle2,
		Loader2,
		AlertCircle,
		FlaskConical,
		ClipboardPaste
	} from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import { parseSnippetFrontmatter } from '$lib/opencode/frontmatter';
	import { setupUnsavedChangesWarning } from '$lib/utils/unsaved-changes';
	import { onMount } from 'svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Form state
	let title = $state('');
	let description = $state('');
	let purpose = $state('');
	let tags = $state<string[]>([]);
	let content = $state('');
	let frontmatterYaml = $state('');
	let showTestRunner = $state(false);

	// Snippet picker state
	let showSnippetPicker = $state(false);
	let snippetInsertText = $state('');

	onMount(() => {
		title = data.prompt.title || '';
		description = data.prompt.description || '';
		purpose = data.prompt.purpose || '';
		tags = data.prompt.tags || [];
		content = data.currentVersion?.content || '';
		frontmatterYaml = (((data.currentVersion as any)?.frontmatterYaml as string) || '') as string;
	});

	// Version control state
	let changeType = $state<'major' | 'minor' | 'patch'>('patch');
	let changeNotes = $state('');

	// AI Improvement state
	let isImproving = $state(false);
	let isGeneratingDescription = $state(false);
	let isGeneratingChangeNotes = $state(false);
	let showVariantModal = $state(false);
	let improvementError = $state('');
	let variants = $state<Array<{ content: string; changeType: string; changeNotes: string }>>([]);

	// Expanded variant tracking for modal
	let expandedVariants = $state<Set<number>>(new Set());

	// Validation state
	let titleError = $state('');
	let contentError = $state('');
	let changeNotesError = $state('');
	let saving = $state(false);
	let saveStatus = $state<'saved' | 'saving' | 'unsaved'>('saved');
	let errorMessage = $state('');

	// Calculate content change significance
	let contentChangeSignificance = $derived(() => {
		const oldContent = (data.currentVersion?.content || '').trim();
		const newContent = content.trim();

		if (oldContent === newContent) return 'none';

		// Check for whitespace-only changes
		const strippedOld = oldContent.replace(/\s+/g, ' ');
		const strippedNew = newContent.replace(/\s+/g, ' ');
		if (strippedOld === strippedNew) return 'whitespace';

		// Calculate word-level difference
		const oldWords = oldContent.split(/\s+/);
		const newWords = newContent.split(/\s+/);
		const wordDiff = Math.abs(oldWords.length - newWords.length);
		const wordRatio = wordDiff / oldWords.length;

		// Less than 5% word change = trivial
		if (wordRatio < 0.05) return 'trivial';

		return 'significant';
	});

	// Extract variables from frontmatter for test runner
	let parsedFrontmatter = $derived(parseSnippetFrontmatter(frontmatterYaml));
	let snippetVariables = $derived(parsedFrontmatter.variables);

	// Validation
	function validateForm(): boolean {
		let isValid = true;
		titleError = '';
		contentError = '';
		changeNotesError = '';

		if (!title.trim()) {
			titleError = 'Title is required';
			isValid = false;
		} else if (title.length > 100) {
			titleError = 'Title must be 100 characters or less';
			isValid = false;
		}

		if (!content.trim()) {
			contentError = 'Prompt content is required';
			isValid = false;
		}

		// Only require change notes for significant changes
		const significance = contentChangeSignificance();
		if (significance === 'significant' && !changeNotes.trim()) {
			changeNotesError = 'Please describe what changed and why';
			isValid = false;
		}

		return isValid;
	}

	// Check if content changed
	let contentChanged = $derived(content.trim() !== (data.currentVersion?.content || '').trim());

	// Check if metadata changed
	let metadataChanged = $derived(
		title.trim() !== (data.prompt.title || '').trim() ||
			description.trim() !== (data.prompt.description || '').trim() ||
			purpose !== (data.prompt.purpose || '') ||
			JSON.stringify(tags) !== JSON.stringify(data.prompt.tags || [])
	);

	// Check if frontmatter changed
	let frontmatterChanged = $derived(
		frontmatterYaml.trim() !==
			((((data.currentVersion as any)?.frontmatterYaml as string) || '') as string).trim()
	);

	// Overall dirty state
	let isDirty = $derived(contentChanged || metadataChanged || frontmatterChanged);

	// Update saveStatus when dirty state changes
	$effect(() => {
		if (isDirty && saveStatus !== 'saving') {
			saveStatus = 'unsaved';
		}
	});

	// Toggle variant expansion
	function toggleVariantExpanded(idx: number) {
		const newSet = new Set(expandedVariants);
		if (newSet.has(idx)) {
			newSet.delete(idx);
		} else {
			newSet.add(idx);
		}
		expandedVariants = newSet;
	}

	// Snippet picker handlers
	function handleSnippetSelect(snippet: { content: string }) {
		// Set the text to insert - the PromptEditor will handle insertion at cursor
		snippetInsertText = snippet.content;
		// Mark as unsaved
		saveStatus = 'unsaved';
	}

	function handleSnippetInsertComplete() {
		// Clear the insert text signal after insertion
		snippetInsertText = '';
	}

	// Generate AI Description
	async function handleGenerateDescription() {
		if (isGeneratingDescription) return;

		isGeneratingDescription = true;

		try {
			const promptText = `Generate a concise description (max 500 characters) for a prompt titled "${title}" with the following content:

${content}

The description should explain what this prompt does in 1-2 sentences.`;

			const response = await fetch('/api/ai/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: promptText })
			});

			if (!response.ok) throw new Error('Failed to generate description');

			const result = await response.json();
			description = result.content || result.message || 'Failed to generate description';
		} catch (err) {
			console.error('Failed to generate description:', err);
		} finally {
			isGeneratingDescription = false;
		}
	}

	// Generate AI Change Notes
	async function handleGenerateChangeNotes() {
		if (isGeneratingChangeNotes) return;

		isGeneratingChangeNotes = true;

		try {
			const oldContent = (data.currentVersion?.content || '').trim();
			const newContent = content.trim();

			const promptText = `Generate concise change notes for a prompt update.

OLD CONTENT:
${oldContent}

NEW CONTENT:
${newContent}

Write 1-2 sentences describing what changed and why. Keep it under 200 characters.`;

			const response = await fetch('/api/ai/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: promptText })
			});

			if (!response.ok) throw new Error('Failed to generate change notes');

			const result = await response.json();
			changeNotes = result.content || result.message || 'Failed to generate change notes';
		} catch (err) {
			console.error('Failed to generate change notes:', err);
		} finally {
			isGeneratingChangeNotes = false;
		}
	}

	// Handle AI Improve for main content
	async function handleImprove() {
		if (isImproving) return;

		isImproving = true;
		improvementError = '';
		expandedVariants = new Set();

		try {
			const response = await fetch(`/api/prompts/${data.prompt.id}/improve`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					versionId: data.currentVersion?.id,
					variantCount: 3,
					autoSelect: false
				})
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || `HTTP ${response.status}: Improvement request failed`);
			}

			const result = await response.json();

			if (!result.data) {
				throw new Error(result.error?.message || 'Improvement request failed');
			}

			// Extract variants
			variants = result.data.variants || [];
			showVariantModal = true;
		} catch (err) {
			improvementError = err instanceof Error ? err.message : 'Unknown error occurred';
		} finally {
			isImproving = false;
		}
	}

	// Select a variant
	function handleSelectVariant(variant: {
		content: string;
		changeType: string;
		changeNotes: string;
	}) {
		content = variant.content;
		changeType = variant.changeType as 'major' | 'minor' | 'patch';
		changeNotes = variant.changeNotes || 'AI-improved version';
		showVariantModal = false;
		variants = [];
		expandedVariants = new Set();
	}

	// Close variant modal
	function handleCloseVariantModal() {
		showVariantModal = false;
		variants = [];
		expandedVariants = new Set();
	}

	// Handle save
	async function handleSave() {
		if (!validateForm()) return;

		saving = true;
		saveStatus = 'saving';
		errorMessage = '';

		try {
			// Update metadata if changed
			if (metadataChanged) {
				await promptsStore.updatePrompt(data.prompt.id, {
					title: title.trim(),
					description: description.trim() || undefined,
					purpose: purpose || undefined,
					tags: tags.length > 0 ? tags : undefined
				});
			}

			// Create new version if:
			// 1. Content changed, OR
			// 2. Frontmatter changed, OR
			// 3. Change notes were added (user explicitly wants to track this change)
			const hasChangeNotes = changeNotes.trim().length > 0;
			if (contentChanged || frontmatterChanged || (hasChangeNotes && metadataChanged)) {
				let defaultNotes = 'Metadata update';
				if (frontmatterChanged && !contentChanged && !metadataChanged) {
					defaultNotes = 'Frontmatter update';
				}

				await promptsStore.createVersion(
					data.prompt.id,
					content.trim(),
					changeType,
					changeNotes.trim() || defaultNotes,
					frontmatterYaml
				);
			}

			// Navigate back to the prompt detail page
			goto(`/prompts/${data.prompt.id}`);
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to save changes';
			saving = false;
		}
	}

	// Handle cancel
	function handleCancel() {
		goto(`/prompts/${data.prompt.id}`);
	}

	// Keyboard shortcut for save
	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 's') {
			e.preventDefault();
			if (!saving && isDirty) {
				handleSave();
			}
		}
		// Escape to cancel
		if (e.key === 'Escape') {
			if (showVariantModal) {
				handleCloseVariantModal();
			} else {
				handleCancel();
			}
		}
	}

	// Setup unsaved changes warning
	$effect(() => {
		const cleanup = setupUnsavedChangesWarning(() => isDirty);
		return cleanup;
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>Edit: {data.prompt.title} | Prompt Management</title>
	<meta name="description" content="Edit {data.prompt.title}" />
</svelte:head>

<div id="edit-prompt-page-section" class="space-y-6">
	<!-- Page Header -->
	<header
		id="edit-prompt-header"
		class="sticky top-0 z-10 flex flex-col gap-4 border-b bg-background/95 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:flex-row sm:items-center sm:justify-between"
	>
		<div>
			<!-- Breadcrumb -->
			<nav
				id="edit-prompt-breadcrumb"
				class="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground"
			>
				<a href="/prompts" class="transition-colors hover:text-foreground">Prompts</a>
				<ChevronRight size={14} />
				<a href="/prompts/{data.prompt.id}" class="transition-colors hover:text-foreground">
					{data.prompt.title}
				</a>
				<ChevronRight size={14} />
				<span class="font-medium text-foreground">Edit</span>
			</nav>

			<h1 class="text-2xl font-bold tracking-tight">Edit Prompt</h1>
			<p class="mt-1 text-sm text-muted-foreground">Update prompt content and metadata</p>
		</div>
		<div class="flex items-center gap-3">
			<!-- Save Status Indicator -->
			{#if saveStatus === 'saving'}
				<div class="flex items-center gap-1.5 text-sm text-blue-500">
					<div
						class="h-3 w-3 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"
					></div>
					<span>Saving...</span>
				</div>
			{:else if saveStatus === 'unsaved'}
				<div class="flex items-center gap-1.5 text-sm text-amber-500">
					<div class="h-2 w-2 rounded-full bg-amber-500"></div>
					<span>Unsaved changes</span>
				</div>
			{:else if saveStatus === 'saved'}
				<div class="flex items-center gap-1.5 text-sm text-green-500">
					<CheckCircle2 size={14} />
					<span>Saved</span>
				</div>
			{/if}

			<Button id="cancel-button" variant="outline" onclick={handleCancel} disabled={saving}>
				Cancel
			</Button>
			<Button
				id="save-changes-button"
				onclick={handleSave}
				loading={saving}
				disabled={saving || !isDirty}
				class="gap-2"
			>
				<Save size={16} />
				Save Changes
			</Button>
		</div>
	</header>

	<!-- Error Message -->
	{#if errorMessage}
		<div
			class="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive"
		>
			{errorMessage}
		</div>
	{/if}

	<!-- Main Content -->
	<div id="edit-prompt-layout" class="grid gap-6 lg:grid-cols-3">
		<!-- Main Editor Area (spans full width on mobile, 2 cols on desktop) -->
		<div id="edit-prompt-main-content" class="space-y-6 lg:col-span-2">
			<!-- Prompt Content with Improve Button -->
			<section id="edit-prompt-content-editor" class="rounded-lg border bg-card p-4">
				<div class="mb-4 flex items-center justify-between">
					<div>
						<h2 class="font-semibold">Prompt Content</h2>
						<p class="text-xs text-muted-foreground">Edit directly or use AI to improve</p>
					</div>
					<div class="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onclick={() => (showSnippetPicker = true)}
							class="gap-1.5"
						>
							<ClipboardPaste size={14} />
							Insert Snippet
						</Button>
						<Button
							variant="outline"
							size="sm"
							onclick={handleImprove}
							disabled={isImproving}
							class="gap-1.5"
						>
							<Sparkles size={14} />
							{isImproving ? 'Improving...' : 'Improve'}
						</Button>
					</div>
				</div>

				{#if improvementError}
					<div
						class="mb-4 rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
					>
						{improvementError}
					</div>
				{/if}

				<PromptEditor
					bind:value={content}
					placeholder="Enter your prompt here..."
					class="w-full"
					insertText={snippetInsertText}
					onInsertComplete={handleSnippetInsertComplete}
				/>
				{#if contentError}
					<p class="mt-2 text-xs text-destructive">{contentError}</p>
				{/if}
			</section>

			<!-- Test Runner Section (Full Width Bento) -->
			<section id="test-runner-section" class="rounded-lg border bg-card p-4">
				<button
					type="button"
					onclick={() => (showTestRunner = !showTestRunner)}
					class="flex w-full items-center justify-between text-left"
				>
					<div class="flex items-center gap-2">
						<FlaskConical class="h-4 w-4 text-muted-foreground" />
						<h2 class="font-semibold">Test Runner</h2>
					</div>
					{#if showTestRunner}
						<ChevronUp class="h-4 w-4 text-muted-foreground" />
					{:else}
						<ChevronDown class="h-4 w-4 text-muted-foreground" />
					{/if}
				</button>

				{#if showTestRunner}
					<div class="mt-4">
						<TestRunnerPanel
							promptId={data.prompt.id}
							template={content}
							variables={snippetVariables}
							functionType="executor"
						/>
					</div>
				{/if}
			</section>

			<!-- Version Control -->
			<section id="version-info-section" class="rounded-lg border bg-card p-4">
				<h2 class="mb-1 font-semibold">Version Information</h2>
				<p class="mb-4 text-xs text-muted-foreground">Describe what changed in this version</p>

				<!-- Change Type Selector -->
				<div id="change-type" class="mb-4">
					<p class="mb-2 block text-sm font-medium">Change Type</p>
					<div class="grid grid-cols-3 gap-2">
						<button
							type="button"
							class={cn(
								'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
								changeType === 'patch'
									? 'border-primary bg-primary text-primary-foreground'
									: 'bg-background hover:bg-muted'
							)}
							onclick={() => (changeType = 'patch')}
						>
							Patch
							<span class="block text-xs opacity-70">Bug fixes</span>
						</button>
						<button
							type="button"
							class={cn(
								'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
								changeType === 'minor'
									? 'border-primary bg-primary text-primary-foreground'
									: 'bg-background hover:bg-muted'
							)}
							onclick={() => (changeType = 'minor')}
						>
							Minor
							<span class="block text-xs opacity-70">New features</span>
						</button>
						<button
							type="button"
							class={cn(
								'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
								changeType === 'major'
									? 'border-primary bg-primary text-primary-foreground'
									: 'bg-background hover:bg-muted'
							)}
							onclick={() => (changeType = 'major')}
						>
							Major
							<span class="block text-xs opacity-70">Breaking changes</span>
						</button>
					</div>
				</div>

				<!-- Change Notes with AI button -->
				<div>
					<div class="mb-2 flex items-center justify-between">
						<p id="change-notes-label" class="text-sm font-medium">
							Change Notes
							{#if contentChangeSignificance() === 'significant'}
								<span class="ml-1 text-destructive">*</span>
							{/if}
						</p>
						<button
							type="button"
							onclick={handleGenerateChangeNotes}
							disabled={isGeneratingChangeNotes || !content}
							class="text-muted-foreground transition-colors hover:text-primary disabled:opacity-50"
							title="Generate change notes with AI"
						>
							<Sparkles size={14} class={isGeneratingChangeNotes ? 'animate-spin' : ''} />
						</button>
					</div>
					<textarea
						id="change-notes-textarea"
						aria-labelledby="change-notes-label"
						bind:value={changeNotes}
						placeholder={contentChangeSignificance() === 'none'
							? 'Optional: Add notes about metadata changes...'
							: contentChangeSignificance() === 'significant'
								? 'Describe what you changed and why...'
								: 'Optional: Add notes (e.g., "fixed typo")'}
						class={cn(
							'flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
							'placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
							changeNotesError && 'border-destructive'
						)}
						disabled={saving}
					></textarea>
					{#if changeNotesError}
						<p class="mt-1 text-xs text-destructive">{changeNotesError}</p>
					{/if}
				</div>
			</section>
		</div>

		<!-- Sidebar -->
		<aside id="edit-prompt-sidebar" class="space-y-4">
			<!-- Prompt Details -->
			<div id="edit-prompt-metadata-form" class="space-y-4 rounded-lg border bg-card p-4">
				<h2 class="mb-3 text-sm font-semibold">Prompt Details</h2>

				<!-- Title, Purpose, Tags (no description, no LLM providers) -->
				<PromptMetadata
					bind:title
					bind:purpose
					bind:tags
					showDescription={false}
					errors={{ title: titleError }}
				/>

				<!-- Description with AI button -->
				<div>
					<div class="mb-2 flex items-center justify-between">
						<label for="description" class="text-sm font-medium">Description</label>
						<button
							type="button"
							onclick={handleGenerateDescription}
							disabled={isGeneratingDescription || !content}
							class="text-muted-foreground transition-colors hover:text-primary disabled:opacity-50"
							title="Generate description with AI"
						>
							<Sparkles size={14} class={isGeneratingDescription ? 'animate-spin' : ''} />
						</button>
					</div>
					<Textarea
						id="description"
						bind:value={description}
						placeholder="Enter a brief description of this prompt"
						rows={3}
						class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
					/>
					<p class="mt-1 text-xs text-muted-foreground">{description.length}/500 characters</p>
				</div>
			</div>

			<!-- Current Version Info -->
			<div id="current-version-section" class="rounded-lg border bg-muted/50 p-4">
				<h3 class="mb-3 text-sm font-semibold">Current Version</h3>
				<div class="space-y-2 text-sm">
					<div class="flex justify-between">
						<span class="text-muted-foreground">Version</span>
						<span class="font-medium">v{data.currentVersion?.version || 'N/A'}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-muted-foreground">Type</span>
						<span class="font-medium capitalize">{data.currentVersion?.changeType || 'N/A'}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-muted-foreground">Notes</span>
						<span class="ml-4 line-clamp-2 text-right font-medium">
							{data.currentVersion?.changeNotes || 'N/A'}
						</span>
					</div>
				</div>
			</div>

			<!-- Tips -->
			<div id="edit-tips-section" class="rounded-lg border bg-muted/50 p-4">
				<h3 class="mb-3 text-sm font-semibold">Tips</h3>
				<div class="flex items-start gap-2 text-sm">
					<Sparkles size={16} class="mt-0.5 text-muted-foreground" />
					<p class="text-muted-foreground">
						Use Version Notes for meaningful changes. Cmd+S saves from anywhere.
					</p>
				</div>
			</div>

			<!-- Keyboard Shortcuts -->
			<div id="edit-keyboard-shortcuts-section" class="rounded-lg border bg-muted/50 p-4">
				<h3 class="mb-3 flex items-center gap-2 text-sm font-semibold">
					<Keyboard class="h-4 w-4 text-muted-foreground" />
					Shortcuts
				</h3>
				<div id="edit-shortcuts-list" class="space-y-2 text-sm">
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Save</span>
						<kbd class="rounded border bg-background px-2 py-0.5 text-xs">⌘S</kbd>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Cancel</span>
						<kbd class="rounded border bg-background px-2 py-0.5 text-xs">Esc</kbd>
					</div>
				</div>
			</div>
		</aside>
	</div>

	<!-- Form dirty indicator -->
	{#if isDirty && !saving}
		<div class="fixed right-4 bottom-4 text-sm text-muted-foreground">
			Press <kbd class="rounded border bg-background px-2 py-0.5 text-xs">⌘S</kbd> to save
		</div>
	{/if}
</div>

<!-- Variant Selection Modal with Full Content -->
{#if showVariantModal}
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
					onclick={handleCloseVariantModal}
					class="text-muted-foreground hover:text-foreground"
				>
					<X size={20} />
				</button>
			</div>

			<!-- Modal Body with Scrollable Content -->
			<div class="flex-1 overflow-y-auto p-6">
				<div class="space-y-4">
					{#each variants as variant, idx}
						{@const isExpanded = expandedVariants.has(idx)}
						<div class="rounded-lg border bg-card">
							<!-- Variant Header -->
							<button
								type="button"
								onclick={() => toggleVariantExpanded(idx)}
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
										<Button size="sm" onclick={() => handleSelectVariant(variant)}>
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
				<Button variant="outline" onclick={handleCloseVariantModal}>Cancel</Button>
			</div>
		</div>
	</div>
{/if}

<!-- Snippet Picker -->
<SnippetPicker
	open={showSnippetPicker}
	onclose={() => (showSnippetPicker = false)}
	onselect={handleSnippetSelect}
/>
