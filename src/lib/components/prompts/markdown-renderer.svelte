<script lang="ts">
	import { marked } from 'marked';
	import { cn } from '$lib/utils';

	interface Props {
		content: string;
		class?: string;
	}

	let { content, class: className = '' }: Props = $props();

	// Configure marked for GitHub Flavored Markdown
	marked.setOptions({
		breaks: true,
		gfm: true
	});

	/**
	 * Escape HTML entities to prevent XSS vulnerabilities
	 */
	function escapeHtml(text: string): string {
		return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	// Parse markdown with HTML escaping for security
	let html = $derived.by(() => {
		try {
			const escaped = escapeHtml(content);
			return marked.parse(escaped) as string;
		} catch {
			// Fallback to escaped pre-formatted text on parse error
			return `<pre>${escapeHtml(content)}</pre>`;
		}
	});

	// Reference to the container element
	let container: HTMLDivElement;

	// Update innerHTML when content changes
	$effect(() => {
		if (container) {
			container.innerHTML = html;
		}
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={container}
	class={cn('markdown-content prose prose-sm max-w-none dark:prose-invert', className)}
></div>

<style>
	:global(.markdown-content pre) {
		@apply overflow-x-auto rounded-lg bg-muted p-4;
	}
	:global(.markdown-content code) {
		@apply font-mono text-sm;
	}
	:global(.markdown-content :not(pre) > code) {
		@apply rounded bg-muted px-1.5 py-0.5;
	}
	:global(.markdown-content ul),
	:global(.markdown-content ol) {
		@apply my-2;
	}
	:global(.markdown-content li) {
		@apply my-1;
	}
	:global(.markdown-content h1),
	:global(.markdown-content h2),
	:global(.markdown-content h3),
	:global(.markdown-content h4) {
		@apply mt-4 mb-2 font-semibold;
	}
	:global(.markdown-content p) {
		@apply my-2;
	}
	:global(.markdown-content blockquote) {
		@apply border-l-4 border-muted-foreground/30 pl-4 italic;
	}
	:global(.markdown-content table) {
		@apply w-full border-collapse;
	}
	:global(.markdown-content th),
	:global(.markdown-content td) {
		@apply border border-border px-3 py-2 text-left;
	}
	:global(.markdown-content th) {
		@apply bg-muted font-semibold;
	}
</style>
