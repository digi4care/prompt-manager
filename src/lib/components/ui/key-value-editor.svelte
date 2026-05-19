<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Plus, Trash2 } from 'lucide-svelte';
	import { cn } from '$lib/utils';

	interface Props {
		value?: Record<string, string>;
		keyPlaceholder?: string;
		valuePlaceholder?: string;
		disabled?: boolean;
		onchange?: (value: Record<string, string>) => void;
		class?: string;
	}

	let {
		value = $bindable({}),
		keyPlaceholder = 'Key',
		valuePlaceholder = 'Value',
		disabled = false,
		onchange,
		class: className = ''
	}: Props = $props();

	interface Entry {
		id: string;
		key: string;
		value: string;
	}

	let nextId = 0;
	function createId(): string {
		return `kve-${++nextId}`;
	}

	// Initialize internal state from prop; component owns editing state
	let entries = $state<Entry[]>(
		Object.entries(value).map(([k, v]) => ({ id: createId(), key: k, value: v }))
	);

	// Sync internal state when parent resets / changes the prop externally
	$effect(() => {
		const propEntries = Object.entries(value).map(([k, v]) => ({ id: createId(), key: k, value: v }));
		// Only overwrite if lengths differ or keys/values changed, to avoid wiping user input
		const currentMap = new Map(entries.map(e => [e.key, e.value]));
		const propMap = new Map(propEntries.map(e => [e.key, e.value]));
		if (
			entries.length !== propEntries.length ||
			!entries.every(e => propMap.get(e.key) === e.value) ||
			!propEntries.every(e => currentMap.get(e.key) === e.value)
		) {
			entries = propEntries;
		}
	});

	function commit() {
		const result: Record<string, string> = {};
		for (const entry of entries) {
			if (entry.key.trim() !== '') {
				result[entry.key] = entry.value;
			}
		}
		value = result;
		onchange?.(result);
	}

	function addEntry() {
		entries = [...entries, { id: createId(), key: '', value: '' }];
	}

	function removeEntry(id: string) {
		entries = entries.filter((e) => e.id !== id);
		commit();
	}

	function updateKey(id: string, newKey: string) {
		const entry = entries.find((e) => e.id === id);
		if (entry) {
			entry.key = newKey;
			commit();
		}
	}

	function updateValue(id: string, newValue: string) {
		const entry = entries.find((e) => e.id === id);
		if (entry) {
			entry.value = newValue;
			commit();
		}
	}
</script>

<div class={cn('space-y-2', className)}>
	{#if entries.length > 0}
		<div class="space-y-2">
			{#each entries as entry (entry.id)}
				<div class="flex items-center gap-2">
					<Input
						type="text"
						value={entry.key}
						oninput={(e: Event) => updateKey(entry.id, (e.currentTarget as HTMLInputElement).value)}
						placeholder={keyPlaceholder}
						{disabled}
						class="flex-1"
					/>
					<Input
						type="text"
						value={entry.value}
						oninput={(e: Event) => updateValue(entry.id, (e.currentTarget as HTMLInputElement).value)}
						placeholder={valuePlaceholder}
						{disabled}
						class="flex-1"
					/>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onclick={() => removeEntry(entry.id)}
						{disabled}
						class="shrink-0 text-muted-foreground hover:text-destructive"
					>
						<Trash2 class="h-4 w-4" />
					</Button>
				</div>
			{/each}
		</div>
	{/if}

	<Button
		type="button"
		variant="outline"
		size="sm"
		onclick={addEntry}
		{disabled}
		class="w-full"
	>
		<Plus class="mr-2 h-4 w-4" />
		Add
	</Button>
</div>
