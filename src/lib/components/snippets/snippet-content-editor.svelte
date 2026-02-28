<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Maximize2, Minimize2, Plus, X, Code, Info } from 'lucide-svelte';

	interface Props {
		/** The content value (bindable) */
		value: string;
		/** Optional change handler */
		onchange?: (value: string) => void;
		/** Placeholder text for textarea */
		placeholder?: string;
		/** Whether the editor is disabled */
		disabled?: boolean;
		/** Maximum height in non-fullscreen mode */
		maxHeight?: string;
	}

	let {
		value = $bindable(''),
		onchange,
		placeholder = 'Enter snippet content with {{VARIABLES}}...',
		disabled = false,
		maxHeight = '400px'
	}: Props = $props();

	// Fullscreen state
	let isFullscreen = $state(false);

	// Variable inserter state
	let showVariableInserter = $state(false);
	let variableName = $state('');
	let variableInputEl: HTMLInputElement | undefined = $state();
	let textareaRef: HTMLTextAreaElement | undefined = $state();

	// Track cursor position for variable insertion
	let cursorPosition = 0;

	// Line numbers
	let lines = $derived(value.split('\n'));

	function handleInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		value = target.value;
		cursorPosition = target.selectionStart;
		onchange?.(value);
	}

	function trackCursorPosition() {
		if (textareaRef) {
			cursorPosition = textareaRef.selectionStart;
		}
	}

	function toggleFullscreen() {
		isFullscreen = !isFullscreen;
		// Refocus textarea after toggle
		setTimeout(() => {
			textareaRef?.focus();
		}, 0);
	}

	function openVariableInserter() {
		showVariableInserter = true;
		variableName = '';
		// Focus input after a brief delay
		setTimeout(() => {
			variableInputEl?.focus();
		}, 50);
	}

	function closeVariableInserter() {
		showVariableInserter = false;
		variableName = '';
		textareaRef?.focus();
	}

	function insertVariable() {
		if (!variableName.trim()) {
			closeVariableInserter();
			return;
		}

		const variableText = `{{${variableName.trim().toUpperCase()}}}`;

		// Insert at cursor position
		const before = value.substring(0, cursorPosition);
		const after = value.substring(cursorPosition);
		value = before + variableText + after;

		// Update cursor position to after the inserted variable
		const newPosition = cursorPosition + variableText.length;
		cursorPosition = newPosition;

		// Close popover and refocus textarea
		closeVariableInserter();

		// Set cursor position after state update
		setTimeout(() => {
			if (textareaRef) {
				textareaRef.selectionStart = newPosition;
				textareaRef.selectionEnd = newPosition;
				textareaRef.focus();
			}
		}, 0);

		onchange?.(value);
	}

	function handleVariableKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			insertVariable();
		} else if (e.key === 'Escape') {
			closeVariableInserter();
		}
	}

	// Handle escape key in fullscreen mode
	function handleFullscreenKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isFullscreen) {
			toggleFullscreen();
		}
	}
</script>

<svelte:window on:keydown={handleFullscreenKeydown} />

<!-- Fullscreen Overlay -->
{#if isFullscreen}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex flex-col bg-background"
		onclick={() => textareaRef?.focus()}
		onkeydown={handleFullscreenKeydown}
	>
		<!-- Fullscreen Toolbar -->
		<div class="flex items-center justify-between border-b bg-card px-4 py-3">
			<div class="flex items-center gap-2">
				<Code class="h-5 w-5 text-muted-foreground" />
				<span class="font-medium">Editing Snippet Content</span>
			</div>
			<div class="flex items-center gap-2">
				<!-- Variable Inserter Button -->
				<Button variant="outline" size="sm" onclick={openVariableInserter} {disabled}>
					<Plus class="mr-1.5 h-4 w-4" />
					Insert Variable
				</Button>
				<!-- Exit Fullscreen Button -->
				<Button variant="outline" size="sm" onclick={toggleFullscreen}>
					<Minimize2 class="mr-1.5 h-4 w-4" />
					Exit Fullscreen
				</Button>
			</div>
		</div>

		<!-- Variable Inserter Popover (Fullscreen) -->
		{#if showVariableInserter}
			<div class="absolute top-16 right-4 z-10 w-72 rounded-lg border bg-card p-4 shadow-lg">
				<div class="mb-3 flex items-center justify-between">
					<span class="text-sm font-medium">Insert Variable</span>
					<button
						type="button"
						onclick={closeVariableInserter}
						class="rounded p-1 hover:bg-muted"
						aria-label="Close"
					>
						<X class="h-4 w-4" />
					</button>
				</div>
				<div class="flex gap-2">
					<input
						bind:this={variableInputEl}
						bind:value={variableName}
						type="text"
						placeholder="VARIABLE_NAME"
						onkeydown={handleVariableKeydown}
						class="flex-1 rounded-md border border-input bg-background px-3 py-2 font-mono text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
					/>
					<Button size="sm" onclick={insertVariable}>Insert</Button>
				</div>
				<p class="mt-2 text-xs text-muted-foreground">
					Will insert: <code class="rounded bg-muted px-1"
						>{'{{'}{variableName.trim().toUpperCase() || 'NAME'}{'}}'}</code
					>
				</p>
			</div>
		{/if}

		<!-- Editor Area with Line Numbers -->
		<div class="flex flex-1 overflow-hidden">
			<!-- Line Numbers -->
			<div class="shrink-0 border-r bg-muted/30 py-3 pr-2 text-right font-mono text-sm">
				<div class="flex flex-col">
					{#each lines as _, i}
						<div class="px-3 leading-6 text-muted-foreground select-none">{i + 1}</div>
					{/each}
				</div>
			</div>

			<!-- Textarea -->
			<textarea
				bind:this={textareaRef}
				bind:value
				onclick={trackCursorPosition}
				onkeyup={trackCursorPosition}
				oninput={handleInput}
				{placeholder}
				{disabled}
				class="flex-1 resize-none bg-transparent p-3 font-mono text-sm focus:outline-none"
			></textarea>
		</div>

		<!-- Help Text -->
		<div class="border-t bg-card px-4 py-2">
			<p class="flex items-center gap-2 text-xs text-muted-foreground">
				<Info class="h-3.5 w-3.5" />
				<span>
					Use <code class="rounded bg-muted px-1">{'{{'}VARIABLE_NAME{'}}'}</code> for placeholders that
					will be replaced when the snippet is used.
				</span>
			</p>
		</div>
	</div>
{:else}
	<!-- Normal Mode Editor -->
	<div class="space-y-2">
		<!-- Toolbar -->
		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				size="sm"
				onclick={openVariableInserter}
				{disabled}
				title="Insert variable placeholder"
			>
				<Plus class="mr-1.5 h-4 w-4" />
				Insert Variable
			</Button>
			<Button
				variant="ghost"
				size="sm"
				onclick={toggleFullscreen}
				{disabled}
				title="Toggle fullscreen mode"
			>
				<Maximize2 class="h-4 w-4" />
			</Button>
		</div>

		<!-- Variable Inserter Popover (Normal Mode) -->
		{#if showVariableInserter}
			<div class="relative mb-2">
				<div class="w-72 rounded-lg border bg-card p-4 shadow-md">
					<div class="mb-3 flex items-center justify-between">
						<span class="text-sm font-medium">Insert Variable</span>
						<button
							type="button"
							onclick={closeVariableInserter}
							class="rounded p-1 hover:bg-muted"
							aria-label="Close"
						>
							<X class="h-4 w-4" />
						</button>
					</div>
					<div class="flex gap-2">
						<input
							bind:this={variableInputEl}
							bind:value={variableName}
							type="text"
							placeholder="VARIABLE_NAME"
							onkeydown={handleVariableKeydown}
							class="flex-1 rounded-md border border-input bg-background px-3 py-2 font-mono text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
						/>
						<Button size="sm" onclick={insertVariable}>Insert</Button>
					</div>
					<p class="mt-2 text-xs text-muted-foreground">
						Will insert: <code class="rounded bg-muted px-1"
							>{'{{'}{variableName.trim().toUpperCase() || 'NAME'}{'}}'}</code
						>
					</p>
				</div>
			</div>
		{/if}

		<!-- Editor Container -->
		<div class="relative flex rounded-md border border-input bg-background">
			<!-- Line Numbers -->
			<div
				class="shrink-0 rounded-l-md border-r bg-muted/30 py-2 text-right font-mono text-sm"
				style="max-height: {maxHeight}; overflow-y: hidden;"
			>
				<div class="flex flex-col">
					{#each lines as _, i}
						<div class="px-3 leading-6 text-muted-foreground select-none">{i + 1}</div>
					{/each}
				</div>
			</div>

			<!-- Textarea -->
			<textarea
				bind:this={textareaRef}
				bind:value
				onclick={trackCursorPosition}
				onkeyup={trackCursorPosition}
				oninput={handleInput}
				{placeholder}
				rows="12"
				{disabled}
				class="min-h-[200px] flex-1 resize-y rounded-r-md bg-transparent px-3 py-2 font-mono text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				style="max-height: {maxHeight};"
			></textarea>
		</div>

		<!-- Help Text -->
		<p class="flex items-center gap-2 text-xs text-muted-foreground">
			<Info class="h-3.5 w-3.5" />
			<span>
				Use <code class="rounded bg-muted px-1">{'{{'}VARIABLE_NAME{'}}'}</code> for placeholders that
				will be replaced when the snippet is used.
			</span>
		</p>
	</div>
{/if}
