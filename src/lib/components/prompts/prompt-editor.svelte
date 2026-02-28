<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import { getMonaco } from '$lib/monaco';

	// Template placeholders for prompts
	const TEMPLATE_PLACEHOLDERS = [
		{ label: 'Context', insert: '{{CONTEXT}}', description: 'User context or background' },
		{ label: 'Task', insert: '{{TASK}}', description: 'The task to perform' },
		{ label: 'Requirements', insert: '{{REQUIREMENTS}}', description: 'Specific requirements' },
		{ label: 'Output Format', insert: '{{OUTPUT_FORMAT}}', description: 'Desired output format' },
		{ label: 'Examples', insert: '{{EXAMPLES}}', description: 'Example inputs/outputs' }
	];

	interface Props {
		id?: string;
		value?: string;
		placeholder?: string;
		language?: string;
		readonly?: boolean;
		onchange?: (value: string) => void;
		class?: string;
		autosaveKey?: string; // Key for localStorage auto-save
		/** When set, inserts this text at cursor position and resets to empty */
		insertText?: string;
		/** Callback after text insertion completes */
		onInsertComplete?: () => void;
	}

	let {
		id,
		value = $bindable(''),
		placeholder = 'Enter your prompt here...',
		language = 'markdown',
		readonly = false,
		onchange,
		class: className = '',
		autosaveKey = 'prompt-editor-draft',
		insertText = '',
		onInsertComplete
	}: Props = $props();

	let editorContainer: HTMLDivElement;
	let editor: any = $state(null);
	let mounted = $state(false);
	let fullscreen = $state(false);
	let showPlaceholderMenu = $state(false);
	let autosaveTimeout: ReturnType<typeof setTimeout> | null = $state(null);
	let lastSavedValue = $state('');
	let wordCount = $derived(countWords(value));
	let charCount = $derived(value.length);
	let monacoInstance: any = $state(null);

	// Get theme from document class
	let isDark = $derived(browser ? document.documentElement.classList.contains('dark') : false);

	function countWords(text: string): number {
		const trimmed = text.trim();
		if (!trimmed) return 0;
		return trimmed.split(/\s+/).filter((word) => word.length > 0).length;
	}

	function getMonacoTheme(): 'vs' | 'vs-dark' {
		return isDark ? 'vs-dark' : 'vs';
	}

	function updateEditorTheme() {
		if (editor && monacoInstance) {
			monacoInstance.editor.setTheme(getMonacoTheme());
		}
	}

	onMount(() => {
		if (!browser) return;

		// Dynamic import to avoid SSR issues
		getMonaco().then((monaco) => {
			monacoInstance = monaco;

			// Restore autosave if exists
			if (autosaveKey) {
				const saved = localStorage.getItem(autosaveKey);
				if (saved && saved !== value) {
					value = saved;
				}
				lastSavedValue = value;
			}

			// Create editor
			editor = monaco.editor.create(editorContainer, {
				value: value,
				language: language,
				theme: getMonacoTheme(),
				readOnly: readonly,
				placeholder: placeholder,
				automaticLayout: true,
				minimap: { enabled: false },
				lineNumbers: 'on',
				roundedSelection: true,
				scrollBeyondLastLine: false,
				fontSize: 14,
				fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
				padding: { top: 16, bottom: 16 },
				scrollbar: {
					vertical: 'visible',
					horizontal: 'visible',
					verticalScrollbarSize: 10,
					horizontalScrollbarSize: 10
				},
				overviewRulerBorder: false,
				hideCursorInOverviewRuler: false,
				overviewRulerLanes: 3,
				contextmenu: true,
				quickSuggestions: true,
				suggestOnTriggerCharacters: true,
				acceptSuggestionOnEnter: 'on',
				tabCompletion: 'on',
				wordWrap: 'on'
			});

			// Handle content changes
			editor.onDidChangeModelContent(() => {
				const newValue = editor?.getValue() ?? '';
				if (newValue !== value) {
					value = newValue;
					onchange?.(newValue);
					scheduleAutoSave();
				}
			});

			mounted = true;

			// Watch for theme changes
			const observer = new MutationObserver((mutations) => {
				for (const mutation of mutations) {
					if (mutation.attributeName === 'class') {
						updateEditorTheme();
					}
				}
			});
			observer.observe(document.documentElement, { attributes: true });

			// Store cleanup function
			return () => {
				observer.disconnect();
			};
		});

		return undefined;
	});

	onDestroy(() => {
		if (editor) {
			editor.dispose();
		}
		if (autosaveTimeout) {
			clearTimeout(autosaveTimeout);
		}
	});

	// Watch for value changes from outside
	$effect(() => {
		if (editor && value !== editor.getValue()) {
			const position = editor.getPosition();
			editor.setValue(value);
			if (position) {
				editor.setPosition(position);
			}
		}
	});

	// Watch for language changes
	$effect(() => {
		if (editor && monacoInstance) {
			const model = editor.getModel();
			if (model) {
				monacoInstance.editor.setModelLanguage(model, language);
			}
		}
	});

	// Watch for readonly changes
	$effect(() => {
		if (editor) {
			editor.updateOptions({ readOnly: readonly });
		}
	});

	// Watch for external text insertion requests
	$effect(() => {
		if (editor && insertText && mounted) {
			insertAtCursor(insertText);
			onInsertComplete?.();
		}
	});

	/**
	 * Insert text at current cursor position
	 */
	function insertAtCursor(text: string) {
		if (!editor) return;

		const position = editor.getPosition();
		if (position) {
			editor.executeEdits('', [
				{
					range: {
						startLineNumber: position.lineNumber,
						startColumn: position.column,
						endLineNumber: position.lineNumber,
						endColumn: position.column
					},
					text: text,
					forceMoveMarkers: true
				}
			]);
			editor.focus();
			// Move cursor to end of inserted text
			const lines = text.split('\n');
			const lastLineLength = lines[lines.length - 1].length;
			if (lines.length === 1) {
				editor.setPosition({
					lineNumber: position.lineNumber,
					column: position.column + text.length
				});
			} else {
				editor.setPosition({
					lineNumber: position.lineNumber + lines.length - 1,
					column: lastLineLength + 1
				});
			}
		}
	}

	function scheduleAutoSave() {
		if (autosaveTimeout) {
			clearTimeout(autosaveTimeout);
		}
		autosaveTimeout = setTimeout(() => {
			saveToLocalStorage();
		}, 1000);
	}

	function saveToLocalStorage() {
		if (autosaveKey && value !== lastSavedValue) {
			localStorage.setItem(autosaveKey, value);
			lastSavedValue = value;
		}
	}

	function clearAutoSave() {
		if (autosaveKey) {
			localStorage.removeItem(autosaveKey);
			lastSavedValue = '';
		}
	}

	function insertPlaceholder(placeholderText: string) {
		if (!editor) return;

		const position = editor.getPosition();
		if (position) {
			editor.executeEdits('', [
				{
					range: {
						startLineNumber: position.lineNumber,
						startColumn: position.column,
						endLineNumber: position.lineNumber,
						endColumn: position.column
					},
					text: placeholderText,
					forceMoveMarkers: true
				}
			]);
			editor.focus();
			editor.setPosition({
				lineNumber: position.lineNumber,
				column: position.column + placeholderText.length
			});
		}
		showPlaceholderMenu = false;
	}

	function toggleFullscreen() {
		fullscreen = !fullscreen;
		if (fullscreen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && fullscreen) {
			toggleFullscreen();
		}
		if (e.key === 'Escape' && showPlaceholderMenu) {
			showPlaceholderMenu = false;
		}
	}

	function handleCopy() {
		if (navigator.clipboard && value) {
			navigator.clipboard.writeText(value);
		}
	}

	function handleClear() {
		if (editor) {
			editor.setValue('');
			value = '';
			onchange?.('');
			clearAutoSave();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class={cn('relative flex flex-col', className)}>
	<!-- Toolbar -->
	<div
		class="flex items-center justify-between gap-2 rounded-t-md border border-x-0 border-t-0 bg-muted/30 px-3 py-2"
	>
		<div class="flex items-center gap-1">
			<!-- Placeholder dropdown -->
			<div class="relative">
				<Button
					variant="ghost"
					size="sm"
					onclick={() => (showPlaceholderMenu = !showPlaceholderMenu)}
					class="h-8 text-xs"
					title="Insert template placeholder"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="mr-1"
					>
						<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
						<polyline points="22,6 12,13 2,6" />
					</svg>
					Insert
				</Button>

				{#if showPlaceholderMenu}
					<div
						class="absolute top-full left-0 z-50 mt-1 min-w-[200px] rounded-md border bg-popover p-1 shadow-lg"
						role="menu"
					>
						{#each TEMPLATE_PLACEHOLDERS as placeholderItem}
							<button
								type="button"
								class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
								role="menuitem"
								onclick={() => insertPlaceholder(placeholderItem.insert)}
							>
								<span class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
									>{placeholderItem.insert}</span
								>
								<span class="text-xs text-muted-foreground">{placeholderItem.description}</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Copy button -->
			<Button
				variant="ghost"
				size="sm"
				onclick={handleCopy}
				class="h-8 text-xs"
				title="Copy content"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="mr-1"
				>
					<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
					<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
				</svg>
				Copy
			</Button>

			<!-- Clear button -->
			<Button
				variant="ghost"
				size="sm"
				onclick={handleClear}
				class="h-8 text-xs text-destructive hover:text-destructive"
				title="Clear content"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="mr-1"
				>
					<path d="M3 6h18" />
					<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
					<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
				</svg>
				Clear
			</Button>
		</div>

		<div class="flex items-center gap-2">
			<!-- Stats -->
			<span class="text-xs text-muted-foreground">
				<span class="font-medium">{charCount}</span> chars
				<span class="mx-1">·</span>
				<span class="font-medium">{wordCount}</span> words
			</span>

			<!-- Fullscreen button -->
			<Button
				variant="ghost"
				size="icon"
				onclick={toggleFullscreen}
				class="h-8 w-8"
				title={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
			>
				{#if fullscreen}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path
							d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"
						/>
					</svg>
				{:else}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path
							d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"
						/>
					</svg>
				{/if}
			</Button>
		</div>
	</div>

	<!-- Editor container -->
	<div
		class={cn(
			'relative overflow-hidden rounded-b-md border',
			fullscreen ? 'fixed inset-0 z-50' : '',
			'editor-container'
		)}
		class:rounded-md={!fullscreen}
	>
		<div bind:this={editorContainer} class="h-full min-h-[300px]"></div>

		{#if !mounted}
			<div
				class="absolute inset-0 flex items-center justify-center bg-background/80 text-muted-foreground"
			>
				<div class="flex items-center gap-2">
					<svg
						class="h-4 w-4 animate-spin"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle
							class="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							stroke-width="4"
						/>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						/>
					</svg>
					<span class="text-sm">Loading editor...</span>
				</div>
			</div>
		{/if}
	</div>

	<!-- Autosave indicator -->
	{#if value !== lastSavedValue}
		<div class="mt-1 flex items-center gap-1">
			<svg
				class="h-3 w-3 animate-spin text-muted-foreground"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
			>
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				/>
			</svg>
			<span class="text-xs text-muted-foreground">Saving...</span>
		</div>
	{:else if lastSavedValue}
		<span class="mt-1 text-xs text-muted-foreground">Saved</span>
	{/if}
</div>

<style>
	.editor-container {
		height: 400px;
	}

	:global(.monaco-editor) {
		padding-top: 8px;
	}

	:global(.monaco-editor .margin) {
		background-color: transparent !important;
	}

	/* Fullscreen styles */
	:global(.fixed.inset-0.z-50) {
		height: 100vh !important;
		width: 100vw !important;
		border-radius: 0 !important;
	}

	:global(.fixed.inset-0.z-50 .monaco-editor) {
		height: 100% !important;
	}
</style>
