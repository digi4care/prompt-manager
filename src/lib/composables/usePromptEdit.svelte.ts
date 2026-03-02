/**
 * usePromptEdit - Composable for prompt editing logic
 *
 * SOLID: Single Responsibility - encapsulates all edit state and business logic
 * separated from UI components for testability and reusability.
 */
import { goto } from '$app/navigation';
import { toast } from 'svelte-sonner';
import { promptsStore } from '$lib/stores/prompts.svelte';
import { parseSnippetFrontmatter } from '$lib/opencode/frontmatter';
import { setupUnsavedChangesWarning } from '$lib/utils/unsaved-changes';
import { onMount, unmount } from 'svelte';

export interface PromptEditState {
	// Form fields
	title: string;
	description: string;
	purpose: string;
	tags: string[];
	content: string;
	frontmatterYaml: string;

	// Version control
	changeType: 'major' | 'minor' | 'patch';
	changeNotes: string;

	// UI state
	showTestRunner: boolean;
	showSnippetPicker: boolean;
	showVariantModal: boolean;

	// Loading states
	saving: boolean;
	isImproving: boolean;
	isGeneratingDescription: boolean;
	isGeneratingChangeNotes: boolean;

	// Error states
	errorMessage: string;
	improvementError: string;
	titleError: string;
	contentError: string;
	changeNotesError: string;

	// Derived state (computed)
	initialized: boolean;
	isDirty: boolean;
	contentChanged: boolean;
	metadataChanged: boolean;
	frontmatterChanged: boolean;
	saveStatus: 'saved' | 'saving' | 'unsaved';
	contentChangeSignificance: 'none' | 'whitespace' | 'trivial' | 'significant';
	snippetVariables: Record<string, unknown>;
}

export interface PromptEditData {
	prompt: {
		id: number;
		title: string;
		description?: string | null;
		purpose?: string | null;
		tags?: string[];
	} & Record<string, unknown>;
	currentVersion?:
		| ({
				id: number;
				content: string;
				version: string | number;
				changeType: string;
				changeNotes?: string | null;
				frontmatterYaml?: string | null;
		  } & Record<string, unknown>)
		| null;
}

export interface Variant {
	content: string;
	changeType: string;
	changeNotes: string;
}

export interface UsePromptEditOptions {
	data: PromptEditData;
	onSaveSuccess?: () => void;
	onCancel?: () => void;
}

export function usePromptEdit(options: UsePromptEditOptions) {
	const { data, onSaveSuccess, onCancel } = options;

	// ==================== FORM STATE ====================
	let title = $state('');
	let description = $state('');
	let purpose = $state('');
	let tags = $state<string[]>([]);
	let content = $state('');
	let frontmatterYaml = $state('');

	// ==================== VERSION CONTROL ====================
	let changeType = $state<'major' | 'minor' | 'patch'>('patch');
	let changeNotes = $state('');

	// ==================== UI STATE ====================
	let showTestRunner = $state(false);
	let showSnippetPicker = $state(false);
	let showVariantModal = $state(false);
	let snippetInsertText = $state('');

	// ==================== LOADING STATES ====================
	let saving = $state(false);
	let isImproving = $state(false);
	let isGeneratingDescription = $state(false);
	let isGeneratingChangeNotes = $state(false);

	// ==================== ERROR STATES ====================
	let errorMessage = $state('');
	let improvementError = $state('');
	let titleError = $state('');
	let contentError = $state('');
	let changeNotesError = $state('');

	// ==================== VARIANT STATE ====================
	let variants = $state<Variant[]>([]);
	let expandedVariants = $state<Set<number>>(new Set());

	// ==================== INITIALIZATION ====================
	let initialized = $state(false);

	function initialize() {
		title = data.prompt.title || '';
		description = data.prompt.description || '';
		purpose = data.prompt.purpose || '';
		tags = data.prompt.tags || [];
		content = data.currentVersion?.content || '';
		frontmatterYaml = (data.currentVersion?.frontmatterYaml as string) || '';
		initialized = true;
	}

	// ==================== DERIVED STATE ====================
	let contentChanged = $derived(content.trim() !== (data.currentVersion?.content || '').trim());

	let metadataChanged = $derived(
		title.trim() !== (data.prompt.title || '').trim() ||
			description.trim() !== (data.prompt.description || '').trim() ||
			purpose !== (data.prompt.purpose || '') ||
			JSON.stringify(tags) !== JSON.stringify(data.prompt.tags || [])
	);

	let frontmatterChanged = $derived(
		frontmatterYaml.trim() !== ((data.currentVersion?.frontmatterYaml as string) || '').trim()
	);

	let isDirty = $derived(initialized && (contentChanged || metadataChanged || frontmatterChanged));

	let saveStatus = $state<'saved' | 'saving' | 'unsaved'>('saved');

	$effect(() => {
		if (isDirty && saveStatus !== 'saving') {
			saveStatus = 'unsaved';
		}
	});

	let contentChangeSignificance = $derived(() => {
		const oldContent = (data.currentVersion?.content || '').trim();
		const newContent = content.trim();

		if (oldContent === newContent) return 'none';

		const strippedOld = oldContent.replace(/\s+/g, ' ');
		const strippedNew = newContent.replace(/\s+/g, ' ');
		if (strippedOld === strippedNew) return 'whitespace';

		const oldWords = oldContent.split(/\s+/);
		const newWords = newContent.split(/\s+/);
		const wordDiff = Math.abs(oldWords.length - newWords.length);
		const wordRatio = wordDiff / oldWords.length;

		if (wordRatio < 0.05) return 'trivial';

		return 'significant';
	});

	let parsedFrontmatter = $derived(parseSnippetFrontmatter(frontmatterYaml));
	let snippetVariables = $derived(parsedFrontmatter.variables);

	// ==================== VALIDATION ====================
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

		if (contentChangeSignificance() === 'significant' && !changeNotes.trim()) {
			changeNotesError = 'Please describe what changed and why';
			isValid = false;
		}

		return isValid;
	}

	// ==================== SNIPPET HANDLERS ====================
	function handleSnippetSelect(snippet: { content: string }) {
		snippetInsertText = snippet.content;
		saveStatus = 'unsaved';
	}

	function handleSnippetInsertComplete() {
		snippetInsertText = '';
	}

	// ==================== AI OPERATIONS ====================
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

			variants = result.data.variants || [];
			showVariantModal = true;
		} catch (err) {
			improvementError = err instanceof Error ? err.message : 'Unknown error occurred';
		} finally {
			isImproving = false;
		}
	}

	// ==================== VARIANT HANDLERS ====================
	function handleSelectVariant(variant: Variant) {
		content = variant.content;
		changeType = variant.changeType as 'major' | 'minor' | 'patch';
		changeNotes = variant.changeNotes || 'AI-improved version';
		showVariantModal = false;
		variants = [];
		expandedVariants = new Set();
	}

	function handleCloseVariantModal() {
		showVariantModal = false;
		variants = [];
		expandedVariants = new Set();
	}

	function toggleVariantExpanded(idx: number) {
		const newSet = new Set(expandedVariants);
		if (newSet.has(idx)) {
			newSet.delete(idx);
		} else {
			newSet.add(idx);
		}
		expandedVariants = newSet;
	}

	// ==================== SAVE/CANCEL ====================
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

			// Create new version if content or frontmatter changed
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

			toast.success('Changes saved successfully');
			saveStatus = 'saved';
			onSaveSuccess?.();
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to save changes';
			saving = false;
			toast.error('Failed to save changes', {
				description: errorMessage
			});
		}
	}

	function handleCancel() {
		onCancel?.();
	}

	// ==================== KEYBOARD SHORTCUTS ====================
	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 's') {
			e.preventDefault();
			if (!saving && isDirty) {
				handleSave();
			}
		}
		if (e.key === 'Escape') {
			if (showVariantModal) {
				handleCloseVariantModal();
			} else {
				handleCancel();
			}
		}
	}

	// ==================== LIFECYCLE ====================
	function mount() {
		initialize();

		// Setup unsaved changes warning
		const cleanup = setupUnsavedChangesWarning(() => isDirty);
		return cleanup;
	}

	// ==================== RETURN PUBLIC API ====================
	return {
		// State (reactive getters/setters)
		get title() {
			return title;
		},
		set title(v: string) {
			title = v;
		},
		get description() {
			return description;
		},
		set description(v: string) {
			description = v;
		},
		get purpose() {
			return purpose;
		},
		set purpose(v: string) {
			purpose = v;
		},
		get tags() {
			return tags;
		},
		set tags(v: string[]) {
			tags = v;
		},
		get content() {
			return content;
		},
		set content(v: string) {
			content = v;
		},
		get frontmatterYaml() {
			return frontmatterYaml;
		},
		set frontmatterYaml(v: string) {
			frontmatterYaml = v;
		},
		get changeType() {
			return changeType;
		},
		set changeType(v: 'major' | 'minor' | 'patch') {
			changeType = v;
		},
		get changeNotes() {
			return changeNotes;
		},
		set changeNotes(v: string) {
			changeNotes = v;
		},
		get showTestRunner() {
			return showTestRunner;
		},
		set showTestRunner(v: boolean) {
			showTestRunner = v;
		},
		get showSnippetPicker() {
			return showSnippetPicker;
		},
		set showSnippetPicker(v: boolean) {
			showSnippetPicker = v;
		},
		get showVariantModal() {
			return showVariantModal;
		},
		set showVariantModal(v: boolean) {
			showVariantModal = v;
		},
		get snippetInsertText() {
			return snippetInsertText;
		},
		get saving() {
			return saving;
		},
		get isImproving() {
			return isImproving;
		},
		get isGeneratingDescription() {
			return isGeneratingDescription;
		},
		get isGeneratingChangeNotes() {
			return isGeneratingChangeNotes;
		},
		get errorMessage() {
			return errorMessage;
		},
		get improvementError() {
			return improvementError;
		},
		get titleError() {
			return titleError;
		},
		get contentError() {
			return contentError;
		},
		get changeNotesError() {
			return changeNotesError;
		},
		get variants() {
			return variants;
		},
		get expandedVariants() {
			return expandedVariants;
		},

		// Derived state (read-only)
		get initialized() {
			return initialized;
		},
		get isDirty() {
			return isDirty;
		},
		get contentChanged() {
			return contentChanged;
		},
		get metadataChanged() {
			return metadataChanged;
		},
		get frontmatterChanged() {
			return frontmatterChanged;
		},
		get saveStatus() {
			return saveStatus;
		},
		get contentChangeSignificance() {
			return contentChangeSignificance;
		},
		get snippetVariables() {
			return snippetVariables;
		},

		// Actions
		handleSave,
		handleCancel,
		handleKeydown,
		handleGenerateDescription,
		handleGenerateChangeNotes,
		handleImprove,
		handleSelectVariant,
		handleCloseVariantModal,
		toggleVariantExpanded,
		handleSnippetSelect,
		handleSnippetInsertComplete,
		mount
	};
}

export type PromptEditController = ReturnType<typeof usePromptEdit>;
