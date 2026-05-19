<script lang="ts">
	import { cn } from '$lib/utils';
	import { X } from 'lucide-svelte';

	interface Props {
		value?: string[];
		placeholder?: string;
		disabled?: boolean;
		class?: string;
		onchange?: (value: string[]) => void;
	}

	let {
		value = $bindable<string[]>([]),
		placeholder = 'Add tag...',
		disabled = false,
		class: className = '',
		onchange
	}: Props = $props();

	let inputValue = $state('');
	let inputRef = $state<HTMLInputElement | null>(null);

	function normalizeTag(tag: string): string {
		return tag.trim().toLowerCase();
	}

	function addTag(raw: string): void {
		const normalized = normalizeTag(raw);
		if (!normalized) return;
		if (value.includes(normalized)) return;

		value = [...value, normalized];
		inputValue = '';
		onchange?.(value);
	}

	function removeTag(tag: string): void {
		value = value.filter((t) => t !== tag);
		onchange?.(value);
	}

	function removeLastTag(): void {
		if (value.length === 0) return;
		value = value.slice(0, -1);
		onchange?.(value);
	}

	function handleKeydown(e: KeyboardEvent): void {
		if (disabled) return;

		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			if (inputValue.trim()) {
				addTag(inputValue);
			}
		} else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
			removeLastTag();
		}
	}

	function handleInput(e: Event): void {
		const target = e.currentTarget as HTMLInputElement;
		// Strip any commas that were typed so they don't appear in the input
		if (target.value.includes(',')) {
			const parts = target.value.split(',');
			// Add all parts except the last one as tags
			for (let i = 0; i < parts.length - 1; i++) {
				addTag(parts[i]);
			}
			// Keep the last part as the current input
			inputValue = parts[parts.length - 1];
		} else {
			inputValue = target.value;
		}
	}

	function handleBlur(): void {
		if (inputValue.trim()) {
			addTag(inputValue);
		}
	}

</script>

<div
	class={cn(
		'flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:outline-none disabled:cursor-not-allowed disabled:opacity-50',
		disabled && 'cursor-not-allowed opacity-50',
		className
	)}
>
	{#each value as tag (tag)}
		<span
			class="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
		>
			{tag}
			{#if !disabled}
				<button
					type="button"
					onclick={(e) => {
						e.stopPropagation();
						removeTag(tag);
					}}
					class="ml-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-secondary-foreground/70 transition-colors hover:bg-secondary-foreground/20 hover:text-secondary-foreground"
					tabindex={-1}
				>
					<X class="h-3 w-3" />
				</button>
			{/if}
		</span>
	{/each}

	<input
		bind:this={inputRef}
		bind:value={inputValue}
		type="text"
		{placeholder}
		{disabled}
		onkeydown={handleKeydown}
		oninput={handleInput}
		onblur={handleBlur}
		class="min-w-[80px] flex-1 bg-transparent py-1 text-sm placeholder:text-muted-foreground focus:outline-none"
	/>
</div>

{#if value.length > 0}
	<p class="mt-1 text-xs text-muted-foreground">
		{value.length} tag{value.length === 1 ? '' : 's'}
	</p>
{/if}