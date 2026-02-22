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
		overflow-x: auto;
		border-radius: 0.5rem;
		background-color: var(--color-muted);
		padding: 1rem;
	}
	:global(.markdown-content code) {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.875rem;
	}
	:global(.markdown-content :not(pre) > code) {
		border-radius: 0.25rem;
		background-color: var(--color-muted);
		padding: 0.125rem 0.375rem;
	}
	:global(.markdown-content ul),
	:global(.markdown-content ol) {
		margin-top: 0.5rem;
		margin-bottom: 0.5rem;
	}
	:global(.markdown-content li) {
		margin-top: 0.25rem;
		margin-bottom: 0.25rem;
	}
	:global(.markdown-content h1),
	:global(.markdown-content h2),
	:global(.markdown-content h3),
	:global(.markdown-content h4) {
		margin-top: 1rem;
		margin-bottom: 0.5rem;
		font-weight: 600;
	}
	:global(.markdown-content p) {
		margin-top: 0.5rem;
		margin-bottom: 0.5rem;
	}
	:global(.markdown-content blockquote) {
		border-left-width: 4px;
		border-left-style: solid;
		border-left-color: rgb(from var(--color-muted-foreground) r g b / 0.3);
		padding-left: 1rem;
		font-style: italic;
	}
	:global(.markdown-content table) {
		width: 100%;
		border-collapse: collapse;
	}
	:global(.markdown-content th),
	:global(.markdown-content td) {
		border-width: 1px;
		border-style: solid;
		border-color: var(--color-border);
		padding: 0.5rem 0.75rem;
		text-align: left;
	}
	:global(.markdown-content th) {
		background-color: var(--color-muted);
		font-weight: 600;
	}
</style>
