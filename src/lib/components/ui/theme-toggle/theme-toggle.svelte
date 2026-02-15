<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import type { Snippet } from 'svelte';

	// Theme state - read from DOM on mount to match app.html
	let isDark = $state(false);
	let mounted = $state(false);

	// Dropdown state
	let dropdownOpen = $state(false);

	// Font settings
	let fontSize = $state(16);
	let textLength = $state(65);
	let textHeight = $state(1.6);

	const fontSizes = [12, 14, 16, 18, 20];
	const textLengths = [50, 60, 65, 70, 80];
	const textHeights = [1.4, 1.5, 1.6, 1.7, 1.8];

	function toggleTheme() {
		isDark = !isDark;
		const html = document.documentElement;
		if (isDark) {
			html.classList.add('dark');
			localStorage.setItem('theme', 'dark');
		} else {
			html.classList.remove('dark');
			localStorage.setItem('theme', 'light');
		}
	}

	function applyFontSettings() {
		const html = document.documentElement;
		html.style.setProperty('--font-size', `${fontSize}px`);
		html.style.setProperty('--text-length', `${textLength}ch`);
		html.style.setProperty('--text-height', textHeight.toString());
	}

	function saveFontSettings() {
		localStorage.setItem('fontSize', fontSize.toString());
		localStorage.setItem('textLength', textLength.toString());
		localStorage.setItem('textHeight', textHeight.toString());
	}

	function handleFontSizeChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		fontSize = parseInt(target.value);
		applyFontSettings();
		saveFontSettings();
	}

	function handleTextLengthChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		textLength = parseInt(target.value);
		applyFontSettings();
		saveFontSettings();
	}

	function handleTextHeightChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		textHeight = parseFloat(target.value);
		applyFontSettings();
		saveFontSettings();
	}

	function resetFontSettings() {
		fontSize = 16;
		textLength = 65;
		textHeight = 1.6;
		applyFontSettings();
		localStorage.removeItem('fontSize');
		localStorage.removeItem('textLength');
		localStorage.removeItem('textHeight');
	}

	function toggleDropdown() {
		dropdownOpen = !dropdownOpen;
	}

	function closeDropdown() {
		dropdownOpen = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			closeDropdown();
		}
	}

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('.settings-dropdown')) {
			closeDropdown();
		}
	}

	onMount(() => {
		// Read actual state from DOM (set by app.html)
		isDark = document.documentElement.classList.contains('dark');

		// Read font settings
		const savedFontSize = localStorage.getItem('fontSize');
		const savedTextLength = localStorage.getItem('textLength');
		const savedTextHeight = localStorage.getItem('textHeight');

		if (savedFontSize) fontSize = parseInt(savedFontSize);
		if (savedTextLength) textLength = parseInt(savedTextLength);
		if (savedTextHeight) textHeight = parseFloat(savedTextHeight);

		applyFontSettings();
		mounted = true;

		// Add click outside listener
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="settings-dropdown relative flex items-center gap-2">
	{#if mounted}
		<!-- Settings/Gear Icon Button -->
		<Button
			variant="ghost"
			size="icon"
			onclick={toggleDropdown}
			aria-label="Settings"
			title="Font settings"
			class="settings-button"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="h-[1.2rem] w-[1.2rem]"
			>
				<circle cx="12" cy="12" r="3" />
				<path
					d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
				/>
			</svg>
		</Button>

		<!-- Theme Toggle Button -->
		<Button
			variant="ghost"
			size="icon"
			onclick={toggleTheme}
			aria-label="Toggle theme"
			title="Toggle dark/light mode"
		>
			{#if isDark}
				<!-- Moon icon -->
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="h-[1.2rem] w-[1.2rem]"
				>
					<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
				</svg>
			{:else}
				<!-- Sun icon -->
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="h-[1.2rem] w-[1.2rem]"
				>
					<circle cx="12" cy="12" r="5" />
					<path
						d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
					/>
				</svg>
			{/if}
		</Button>
	{/if}

	<!-- Settings Dropdown -->
	{#if dropdownOpen}
		<div
			class="fixed top-1/2 left-1/2 z-50 mt-2 w-72 -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-4 shadow-lg sm:absolute sm:top-full sm:right-0 sm:left-auto sm:translate-x-0 sm:translate-y-0"
			role="menu"
		>
			<div class="space-y-4">
				<h3 class="text-sm font-semibold">Font Settings</h3>

				<div class="space-y-2">
					<p class="text-xs text-muted-foreground">Size</p>
					<div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Font size">
						{#each fontSizes as size}
							<button
								type="button"
								class="rounded-md border px-3 py-1 text-sm transition-colors"
								class:bg-primary={fontSize === size}
								class:text-primary-foreground={fontSize === size}
								class:bg-background={fontSize !== size}
								onclick={() => {
									fontSize = size;
									applyFontSettings();
									saveFontSettings();
								}}
								role="radio"
								aria-checked={fontSize === size}
							>
								{size}px
							</button>
						{/each}
					</div>
				</div>

				<div class="space-y-2">
					<p class="text-xs text-muted-foreground">Width</p>
					<div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Text width">
						{#each textLengths as length}
							<button
								type="button"
								class="rounded-md border px-3 py-1 text-sm transition-colors"
								class:bg-primary={textLength === length}
								class:text-primary-foreground={textLength === length}
								class:bg-background={textLength !== length}
								onclick={() => {
									textLength = length;
									applyFontSettings();
									saveFontSettings();
								}}
								role="radio"
								aria-checked={textLength === length}
							>
								{length}ch
							</button>
						{/each}
					</div>
				</div>

				<div class="space-y-2">
					<p class="text-xs text-muted-foreground">Height</p>
					<div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Line height">
						{#each textHeights as height}
							<button
								type="button"
								class="rounded-md border px-3 py-1 text-sm transition-colors"
								class:bg-primary={textHeight === height}
								class:text-primary-foreground={textHeight === height}
								class:bg-background={textHeight !== height}
								onclick={() => {
									textHeight = height;
									applyFontSettings();
									saveFontSettings();
								}}
								role="radio"
								aria-checked={textHeight === height}
							>
								{height}
							</button>
						{/each}
					</div>
				</div>

				<button
					type="button"
					class="w-full text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
					onclick={resetFontSettings}
				>
					Reset defaults
				</button>
			</div>
		</div>
	{/if}
</div>
