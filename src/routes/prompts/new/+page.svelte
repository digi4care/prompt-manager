<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { PromptEditor } from '$lib/components/prompts';
	import { PromptMetadata } from '$lib/components/prompts';
	import { promptsStore } from '$lib/stores/prompts.svelte';
	import { goto } from '$app/navigation';
	import { cn } from '$lib/utils';
	import { setupUnsavedChangesWarning } from '$lib/utils/unsaved-changes';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Form state
	let title = $state('');
	let description = $state('');
	let purpose = $state('');
	let tags = $state<string[]>([]);
	let llmProviders = $state<string[]>([]);
	let content = $state('');

			// Editor change handler
	function handleContentChange(newContent: string) {
		content = newContent;
	}

	// Validation state
	let titleError = $state('');
	let contentError = $state('');
	let saving = $state(false);
	let errorMessage = $state('');

	// Validation
	function validateForm(): boolean {
		let isValid = true;
		titleError = '';
		contentError = '';

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

		return isValid;
	}

	// Handle save
	async function handleSave() {
		if (!validateForm()) {
			return;
		}

		saving = true;
		errorMessage = '';

		try {
			const newPrompt = await promptsStore.createPrompt({
				title: title.trim(),
				description: description.trim() || undefined,
				purpose: purpose || undefined,
				tags: tags.length > 0 ? tags : undefined,
				llmProviders: llmProviders.length > 0 ? llmProviders : undefined,
				content: content.trim()
			});

			// Navigate to the new prompt's detail page
			goto(`/prompts/${newPrompt.id}`);
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to create prompt';
			saving = false;
		}
	}

	// Handle cancel
	function handleCancel() {
		goto('/prompts');
	}

	// Check if form is dirty
	let isDirty = $derived(
		title.trim() !== '' ||
			description.trim() !== '' ||
			purpose !== '' ||
			tags.length > 0 ||
			llmProviders.length > 0 ||
			content.trim() !== ''
	);

	// Keyboard shortcut for save
	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 's') {
			e.preventDefault();
			if (!saving) {
				handleSave();
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
	<title>New Prompt | Prompt Management</title>
	<meta name="description" content="Create a new prompt" />
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Create New Prompt</h1>
			<p class="text-muted-foreground mt-1">
				Add a new prompt to your collection
			</p>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="outline" onclick={handleCancel} disabled={saving}>
				Cancel
			</Button>
			<Button onclick={handleSave} loading={saving} disabled={saving}>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="mr-2"
				>
					<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
					<polyline points="17 21 17 13 7 13 7 21" />
					<polyline points="7 3 7 8 15 8" />
				</svg>
				Save Prompt
			</Button>
		</div>
	</div>

	<!-- Error Message -->
	{#if errorMessage}
		<div
			class="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive"
			role="alert"
		>
			<div class="flex items-center gap-2">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<circle cx="12" cy="12" r="10" />
					<line x1="12" x2="12" y1="8" y2="12" />
					<line x1="12" x2="12.01" y1="16" y2="16" />
				</svg>
				{errorMessage}
			</div>
		</div>
	{/if}

	<!-- Form -->
	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Main Content Area -->
		<div class="lg:col-span-2 space-y-6">
			<!-- Prompt Content Editor -->
			<div class="rounded-lg border bg-card">
				<div class="flex flex-col space-y-1.5 p-6">
					<h2 class="text-lg font-semibold leading-none tracking-tight">Prompt Content</h2>
					<p class="text-sm text-muted-foreground">
						Enter the actual prompt text. You can use template placeholders for dynamic content.
					</p>
				</div>
				<div class="p-6 pt-0">
					<PromptEditor
						id="new-prompt-editor"
						value={content}
						language="markdown"
						placeholder="Enter your prompt here..."
						onchange={handleContentChange}
					/>
					{#if contentError}
						<p class="text-xs text-destructive mt-2">{contentError}</p>
					{/if}
				</div>
			</div>
		</div>

		<!-- Sidebar - Metadata Form -->
		<aside class="space-y-6">
			<div class="rounded-lg border bg-card">
				<div class="flex flex-col space-y-1.5 p-6">
					<h2 class="text-lg font-semibold leading-none tracking-tight">Prompt Details</h2>
					<p class="text-sm text-muted-foreground">
						Provide metadata to help organize and find this prompt later.
					</p>
				</div>
				<div class="p-6 pt-0">
					<PromptMetadata
						title={title}
						description={description}
						purpose={purpose}
						tags={tags}
						llmProviders={llmProviders}
						errors={{ title: titleError }}
					/>
				</div>
			</div>

			<!-- Tips Card -->
			<div class="rounded-lg border bg-muted/50 p-4">
				<h3 class="font-semibold flex items-center gap-2 mb-3">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<circle cx="12" cy="12" r="10" />
						<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
						<path d="M12 17h.01" />
					</svg>
					Tips
				</h3>
				<ul class="space-y-2 text-sm text-muted-foreground">
					<li class="flex items-start gap-2">
						<span class="text-primary">•</span>
						Use descriptive titles to make prompts easy to find
					</li>
					<li class="flex items-start gap-2">
						<span class="text-primary">•</span>
						Add tags to categorize and filter prompts
					</li>
					<li class="flex items-start gap-2">
						<span class="text-primary">•</span>
						Template placeholders like {"{{TASK}}"} allow dynamic content
					</li>
					<li class="flex items-start gap-2">
						<span class="text-primary">•</span>
						Saving will create version 1.0 of your prompt
					</li>
				</ul>
			</div>

			<!-- Keyboard Shortcuts -->
			<div class="rounded-lg border bg-muted/50 p-4">
				<h3 class="font-semibold flex items-center gap-2 mb-3">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
						<path d="M6 8h.01" />
						<path d="M10 8h.01" />
						<path d="M14 8h.01" />
						<path d="M18 8h.01" />
						<path d="M8 12h8" />
						<path d="M6 16h.01" />
						<path d="M10 16h.01" />
						<path d="M14 16h.01" />
						<path d="M18 16h.01" />
					</svg>
					Keyboard Shortcuts
				</h3>
				<div class="space-y-2 text-sm">
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Save</span>
						<kbd
							class="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground"
						>
							<span class="text-xs">⌘</span>S
						</kbd>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Cancel</span>
						<kbd
							class="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground"
						>
							Esc
						</kbd>
					</div>
				</div>
			</div>
		</aside>
	</div>

	<!-- Form dirty indicator -->
	{#if isDirty && !saving}
		<div class="fixed bottom-4 right-4 text-sm text-muted-foreground">
			Press <kbd
				class="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium"
			>
				<span class="text-xs">⌘</span>S
			</kbd>
			to save
		</div>
	{/if}
</div>
