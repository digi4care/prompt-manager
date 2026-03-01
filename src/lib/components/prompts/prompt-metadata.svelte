<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { cn } from '$lib/utils';
	import type { CreatePromptInput, UpdatePromptInput } from '$lib/stores/prompts.svelte';
	import { validateField, type PromptMetadataData } from '$lib/validators/prompt-metadata';
	import { X, ChevronDown } from 'lucide-svelte';
	import { contentTypesStore } from '$lib/stores/content-types.svelte';
	import { onMount } from 'svelte';

	// Click outside action for closing dropdowns
	function clickOutside(node: HTMLElement, callback: () => void) {
		const handleClick = (event: MouseEvent) => {
			if (node && !node.contains(event.target as Node) && !event.defaultPrevented) {
				callback();
			}
		};

		document.addEventListener('click', handleClick, true);

		return {
			destroy() {
				document.removeEventListener('click', handleClick, true);
			}
		};
	}

	interface Props {
		// Bindable props for form fields
		title?: string;
		description?: string;
		purpose?: string;
		tags?: string[];
		llmProviders?: string[]; // Changed from platform to llmProviders (multi-select)
		showDescription?: boolean;
		// Optional data prop for initial values (used when binding)
		data?: Partial<CreatePromptInput | UpdatePromptInput>;
		// Error messages
		errors?: Record<string, string>;
		disabled?: boolean;
		class?: string;
	}

	let {
		title = $bindable(''),
		description = $bindable(''),
		purpose = $bindable(''),
		tags = $bindable<string[]>([]),
		llmProviders = $bindable<string[]>([]),
		showDescription = true,
		data = {},
		errors = {},
		disabled = false,
		class: className = ''
	}: Props = $props();

	// Load content types on mount
	onMount(() => {
		contentTypesStore.load();
	});

	// Local state for tags input
	let tagInput = $state('');
	let showTagSuggestions = $state(false);

	// Local state for LLM providers multi-select
	let showLlmDropdown = $state(false);
	let llmSearchInput = $state('');

	// Purposes and LLM providers from store
	let purposeOptions = $derived(
		contentTypesStore.purposes.map((p) => ({
			value: p,
			label: p.charAt(0).toUpperCase() + p.slice(1)
		}))
	);

	let llmProviderOptions = $derived(
		contentTypesStore.llmProviders.map((p) => ({
			value: p,
			label: p.charAt(0).toUpperCase() + p.slice(1)
		}))
	);

	let filteredLlmProviders = $derived(
		llmSearchInput
			? llmProviderOptions.filter((p) =>
					p.value.toLowerCase().includes(llmSearchInput.toLowerCase())
				)
			: llmProviderOptions
	);

	// Common tag suggestions for autocomplete
	const TAG_SUGGESTIONS = [
		'javascript',
		'typescript',
		'python',
		'react',
		'svelte',
		'vue',
		'node',
		'api',
		'database',
		'auth',
		'frontend',
		'backend',
		'fullstack',
		'cli',
		'script',
		'utility',
		'prompt',
		'system',
		'user',
		'assistant'
	];

	// Internal editable state mirrors bindable props
	let _tags = $state(tags);

	// Update bindable tags when internal state changes
	$effect(() => {
		tags = _tags;
	});

	// Sync internal state with bindable prop when it changes externally
	$effect(() => {
		if (data.tags && JSON.stringify(data.tags) !== JSON.stringify(_tags)) {
			_tags = data.tags;
		}
	});

	let _llmProviders = $state<string[]>(llmProviders || []);

	// Update bindable llmProviders when internal state changes
	$effect(() => {
		llmProviders = _llmProviders;
	});

	// Sync internal state with bindable prop when it changes externally
	$effect(() => {
		if (data.llmProviders && JSON.stringify(data.llmProviders) !== JSON.stringify(_llmProviders)) {
			_llmProviders = data.llmProviders;
		}
	});

	// Filtered suggestions based on input
	let filteredSuggestions = $derived(
		tagInput
			? TAG_SUGGESTIONS.filter(
					(tag) => tag.toLowerCase().includes(tagInput.toLowerCase()) && !_tags.includes(tag)
				).slice(0, 5)
			: []
	);

	function addTag(tag: string): void {
		const normalizedTag = tag.trim().toLowerCase();
		if (normalizedTag && !_tags.includes(normalizedTag)) {
			_tags = [..._tags, normalizedTag];
			tags = _tags;
			tagInput = '';
		}
		showTagSuggestions = false;
	}

	function removeTag(tag: string): void {
		_tags = _tags.filter((t) => t !== tag);
		tags = _tags;
	}

	function handleTagKeydown(e: KeyboardEvent): void {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			if (tagInput.trim()) {
				addTag(tagInput);
			}
		} else if (e.key === 'Backspace' && !tagInput && _tags.length > 0) {
			removeTag(_tags[_tags.length - 1]);
		} else if (e.key === 'Escape') {
			showTagSuggestions = false;
		} else if (e.key === 'ArrowDown' && filteredSuggestions.length > 0) {
			e.preventDefault();
			showTagSuggestions = true;
		}
	}

	function handleTagBlur(): void {
		// Small delay to allow click on suggestion
		setTimeout(() => {
			showTagSuggestions = false;
		}, 200);
	}

	// LLM Providers multi-select functions
	function toggleLlmProvider(provider: string): void {
		if (_llmProviders.includes(provider)) {
			_llmProviders = _llmProviders.filter((p) => p !== provider);
		} else {
			_llmProviders = [..._llmProviders, provider];
		}
		llmProviders = _llmProviders;
	}

	function removeLlmProvider(provider: string): void {
		_llmProviders = _llmProviders.filter((p) => p !== provider);
		llmProviders = _llmProviders;
	}

	let _title = $state(title || '');
	let _description = $state(description || '');
	let _purpose = $state(purpose || '');

	// Sync internal state with bindable props when they change from outside
	$effect(() => {
		if (title !== undefined && title !== _title) _title = title;
	});
	$effect(() => {
		if (description !== undefined && description !== _description) _description = description;
	});
	$effect(() => {
		if (purpose !== undefined && purpose !== _purpose) _purpose = purpose;
	});

	// Sync bindable props with internal state (outward sync)
	$effect(() => {
		title = _title;
	});
	$effect(() => {
		description = _description;
	});
	$effect(() => {
		purpose = _purpose;
	});

	// Sync from data prop (for non-bound usage)
	$effect(() => {
		if (data.title !== undefined && data.title !== _title) _title = data.title;
		if (data.description !== undefined && data.description !== _description) {
			_description = data.description;
		}
		if (data.purpose !== undefined && data.purpose !== _purpose) _purpose = data.purpose;
	});

	// Error states
	let titleError = $state('');
	let descriptionError = $state('');

	// Validate on change - validate internal state
	$effect(() => {
		if (_title.length > 100) {
			titleError = 'Title must be 100 characters or less';
		} else {
			titleError = '';
		}
	});

	$effect(() => {
		if (_description.length > 500) {
			descriptionError = 'Description must be 500 characters or less';
		} else {
			descriptionError = '';
		}
	});
</script>

<div class={cn('space-y-4', className)}>
	<!-- Title Input -->
	<div class="space-y-2">
		<label
			for="title"
			class="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
		>
			Title <span class="text-destructive">*</span>
		</label>
		<Input
			id="title"
			bind:value={_title}
			placeholder="Enter prompt title"
			{disabled}
			required
			error={!!titleError}
			class={cn(titleError && 'border-destructive')}
		/>
		{#if titleError}
			<p class="text-xs text-destructive">{titleError}</p>
		{:else if _title.length > 0}
			<p class="text-xs text-muted-foreground">{_title.length}/100 characters</p>
		{/if}
	</div>

	{#if showDescription}
		<!-- Description Textarea -->
		<div class="space-y-2">
			<label
				for="description"
				class="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
			>
				Description
			</label>
			<Textarea
				id="description"
				bind:value={_description}
				placeholder="Enter a brief description of this prompt"
				{disabled}
				rows={3}
				error={!!descriptionError}
				class={cn(descriptionError && 'border-destructive')}
			/>
			{#if descriptionError}
				<p class="text-xs text-destructive">{descriptionError}</p>
			{:else}
				<p class="text-xs text-muted-foreground">{_description.length}/500 characters</p>
			{/if}
		</div>
	{/if}

	<!-- Purpose Dropdown -->
	<div class="space-y-2">
		<label
			for="purpose"
			class="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
		>
			Purpose
		</label>
		<select
			id="purpose"
			bind:value={_purpose}
			disabled={disabled || !contentTypesStore.loaded}
			class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
		>
			<option value="">Select purpose...</option>
			{#each purposeOptions as option}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
		<p class="text-xs text-muted-foreground">Categorizes what this prompt is for.</p>
	</div>

	<!-- Tags Input with Autocomplete -->
	<div class="space-y-2">
		<label
			for="tags"
			class="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
		>
			Tags
		</label>
		<div class="relative">
			<Input
				id="tags"
				bind:value={tagInput}
				placeholder="Type a tag and press Enter"
				{disabled}
				onkeydown={handleTagKeydown}
				onfocus={() => {
					if (tagInput) showTagSuggestions = true;
				}}
				onblur={handleTagBlur}
			/>

			<!-- Tag Suggestions Dropdown -->
			{#if showTagSuggestions && filteredSuggestions.length > 0}
				<div
					class="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover py-1 shadow-md"
					role="listbox"
				>
					{#each filteredSuggestions as suggestion, index}
						<button
							type="button"
							class="w-full cursor-pointer px-3 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
							role="option"
							aria-selected="false"
							onmousedown={() => addTag(suggestion)}
						>
							{suggestion}
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Selected Tags -->
		{#if _tags.length > 0}
			<div class="mt-2 flex flex-wrap gap-2">
				{#each _tags as tag}
					<span
						class="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
					>
						{tag}
						<button
							type="button"
							class="ml-1 cursor-pointer rounded-md p-0.5 hover:bg-secondary-foreground/20 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
							onclick={() => removeTag(tag)}
							{disabled}
							aria-label="Remove tag {tag}"
						>
							<X class="h-3 w-3" />
						</button>
					</span>
				{/each}
			</div>
		{/if}

		<p class="text-xs text-muted-foreground">
			Press Enter or comma to add a tag. Tags help organize and find prompts.
		</p>
	</div>
</div>
