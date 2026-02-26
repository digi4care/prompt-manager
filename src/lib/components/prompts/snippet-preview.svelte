<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import AlertCircle from 'lucide-svelte/icons/alert-circle';
	import CheckCircle from 'lucide-svelte/icons/check-circle';
	import { extractVariables, resolveVariables } from '$lib/utils/snippet-variables';
	import type { SnippetVariable } from '$lib/utils/snippet-variables';

	interface Props {
		template: string;
		variables?: SnippetVariable[];
		class?: string;
	}

	let { template, variables = [], class: className }: Props = $props();

	// Extract variable names from template
	let templateVars = $derived(extractVariables(template).map((v) => v.name));

	// Build unique variable list (template + definitions)
	let allVarNames = $derived(() => {
		const defined = new Set(variables.map((v) => v.name));
		const inTemplate = new Set(templateVars);
		return [...new Set([...inTemplate, ...defined])];
	});

	// Variable input values (reactive state)
	let values = $state<Record<string, string>>({});

	// Initialize defaults from definitions
	$effect(() => {
		for (const v of variables) {
			if (v.default && !(v.name in values)) {
				values[v.name] = v.default;
			}
		}
	});

	// Reactive preview - updates on every keystroke
	let preview = $derived(resolveVariables(template, values, variables));

	// Required variable names from definitions
	let requiredVarNames = $derived(
		new Set(variables.filter((v) => v.required !== false).map((v) => v.name))
	);

	// Missing required variables for error display
	let missingRequired = $derived(
		preview.missingVariables.filter((name) => requiredVarNames.has(name))
	);

	// Has any variables to show
	let hasVariables = $derived(allVarNames().length > 0);
</script>

<div class={className}>
	<!-- Variable Inputs -->
	{#if hasVariables}
		<Card class="mb-4 p-4">
			<h3 class="mb-3 text-sm font-medium">Variables</h3>
			<div class="grid gap-3">
				{#each allVarNames() as varName (varName)}
					{@const definition = variables.find((v) => v.name === varName)}
					{@const inputId = `var-${varName}`}
					<div>
						<label for={inputId} class="mb-1 block text-xs text-muted-foreground">
							{varName}
							{#if definition?.required !== false}
								<span class="text-red-500">*</span>
							{/if}
						</label>
						<Input
							id={inputId}
							bind:value={values[varName]}
							placeholder={definition?.description || `Enter ${varName}`}
						/>
					</div>
				{/each}
			</div>
		</Card>
	{/if}

	<!-- Preview Output -->
	<Card class="p-4">
		<div class="mb-2 flex items-center justify-between">
			<h3 class="text-sm font-medium">Preview</h3>
			{#if missingRequired.length > 0}
				<Badge variant="destructive" class="flex items-center gap-1">
					<AlertCircle class="h-3 w-3" />
					{missingRequired.length} missing
				</Badge>
			{:else if hasVariables}
				<Badge variant="default" class="flex items-center gap-1 bg-green-600">
					<CheckCircle class="h-3 w-3" />
					Resolved
				</Badge>
			{/if}
		</div>

		{#if missingRequired.length > 0}
			<div class="mb-2 rounded bg-destructive/10 p-2 text-sm text-destructive">
				Missing required variables: {missingRequired.join(', ')}
			</div>
		{/if}

		<pre
			class="rounded bg-muted/50 p-3 font-mono text-sm whitespace-pre-wrap">{preview.content}</pre>
	</Card>
</div>
