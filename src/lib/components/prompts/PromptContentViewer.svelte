<script lang="ts">
	import { copyToClipboard } from '$lib/utils/clipboard';
	import { cn } from '$lib/utils';

	interface Props {
		content: string;
		language?: string;
		class?: string;
	}

	let { content, language = 'markdown', class: className }: Props = $props();

	let copying = $state(false);
	let copied = $state(false);

	async function handleCopy() {
		if (copying || copied) return;

		copying = true;
		try {
			await copyToClipboard(content);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		} finally {
			copying = false;
		}
	}

	// Format content for display with proper whitespace
	let formattedContent = $derived(content.trim());

	// Calculate line count for display
	let lineCount = $derived(formattedContent.split('\n').length);
</script>

<div class={cn('group relative', className)}>
	<!-- Header with Copy Button -->
	<div class="mb-3 flex items-center justify-between px-1">
		<span class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
			{language} • {lineCount}
			{lineCount === 1 ? 'line' : 'lines'}
		</span>
		<button
			onclick={handleCopy}
			disabled={copying}
			class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
			aria-label="Copy content to clipboard"
		>
			{#if copying}
				<svg
					class="h-3.5 w-3.5 animate-spin"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
				Copying...
			{:else if copied}
				<svg
					class="h-3.5 w-3.5 text-green-500"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
						clip-rule="evenodd"
					/>
				</svg>
				Copied!
			{:else}
				<svg
					class="h-3.5 w-3.5"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
					/>
				</svg>
				Copy
			{/if}
		</button>
	</div>

	<!-- Content Display - Properly Formatted -->
	<div class="relative">
		<pre
			class="w-full overflow-x-auto rounded-lg border bg-muted/50 p-4 text-sm leading-relaxed"
			aria-label="Prompt content"><code class="font-mono">{formattedContent}</code></pre>

		<!-- Subtle hover effect -->
		<div
			class="pointer-events-none absolute inset-0 rounded-lg border-2 border-primary/0 transition-colors group-hover:border-primary/10"
		></div>
	</div>
</div>
