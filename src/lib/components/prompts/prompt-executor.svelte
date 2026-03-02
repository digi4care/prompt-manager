<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils';
	import { Play, Loader2, Users, MessageSquare } from 'lucide-svelte';
	import { CouncilReviewPanel } from '$lib/components/council';
	import { CouncilDebatePanel } from '$lib/components/council';
	import { CouncilCorrectPanel } from '$lib/components/council';
	import { toast } from 'svelte-sonner';
	import * as m from '$lib/paraglide/messages.js';

	type ExecutionMode = 'single' | 'review' | 'debate' | 'correct';

	interface Props {
		promptId: number;
		template: string;
	}

	let { promptId, template }: Props = $props();

	// State
	let mode = $state<ExecutionMode>('single');
	let variableInputs = $state<Record<string, string>>({});
	let running = $state(false);
	let result = $state<string | null>(null);
	let error = $state<string | null>(null);

	// Extract variables from template
	function extractVariables(tpl: string): string[] {
		const regex = /\{\{(\w+)\}\}/g;
		const vars: string[] = [];
		let match: RegExpExecArray | null = regex.exec(tpl);
		while (match !== null) {
			if (!vars.includes(match[1])) {
				vars.push(match[1]);
			}
			match = regex.exec(tpl);
		}
		return vars;
	}

	// Derived state
	let variables = $derived(extractVariables(template));
	let processedContent = $derived(() => {
		let result = template;
		for (const [varName, value] of Object.entries(variableInputs)) {
			result = result.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), value || '');
		}
		return result;
	});
	let allVariablesFilled = $derived(
		variables.length === 0 || variables.every((v) => (variableInputs[v] ?? '').trim() !== '')
	);

	// Initialize variable inputs when template changes
	$effect(() => {
		const vars = extractVariables(template);
		const newInputs: Record<string, string> = {};
		for (const v of vars) {
			newInputs[v] = variableInputs[v] ?? '';
		}
		variableInputs = newInputs;
	});

	// Run single execution
	async function runSingle() {
		if (!allVariablesFilled) {
			toast.error('Please fill in all variables');
			return;
		}

		running = true;
		result = null;
		error = null;

		try {
			const response = await fetch(`/api/prompts/${promptId}/execute`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					content: processedContent()
				})
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			const data = await response.json();
			result = data.result || data.output || 'Execution completed';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Execution failed';
		} finally {
			running = false;
		}
	}
</script>

<section class="rounded-lg border bg-card p-4">
	<!-- Mode Tabs -->
	<div class="mb-4 flex items-center justify-between border-b pb-3">
		<div class="flex gap-1 rounded-lg bg-muted p-1">
			<button
				class={cn(
					'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
					mode === 'single' && 'bg-background shadow-sm',
					mode !== 'single' && 'text-muted-foreground hover:text-foreground'
				)}
				onclick={() => (mode = 'single')}
			>
				<Play size={14} />
				Single
			</button>
			<button
				class={cn(
					'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
					mode === 'review' && 'bg-background shadow-sm',
					mode !== 'review' && 'text-muted-foreground hover:text-foreground'
				)}
				onclick={() => (mode = 'review')}
			>
				<Users size={14} />
				Review
			</button>
			<button
				class={cn(
					'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
					mode === 'debate' && 'bg-background shadow-sm',
					mode !== 'debate' && 'text-muted-foreground hover:text-foreground'
				)}
				onclick={() => (mode = 'debate')}
			>
				<MessageSquare size={14} />
				Debate
			</button>
		</div>
	</div>

	<!-- Variables Input -->
	{#if variables.length > 0}
		<div class="mb-4 space-y-3">
			<div class="flex items-center justify-between">
				<h3 class="text-sm font-medium">Variables</h3>
				<Badge variant="secondary">{variables.length}</Badge>
			</div>
			<div class="grid gap-3 sm:grid-cols-2">
				{#each variables as varName}
					<div>
						<Label for="var-{varName}" class="mb-1.5 block text-xs text-muted-foreground">
							{`{{${varName}}}`}
						</Label>
						<Input
							id="var-{varName}"
							type="text"
							value={variableInputs[varName] ?? ''}
							oninput={(e: Event) => {
								const target = e.currentTarget as HTMLInputElement;
								variableInputs[varName] = target.value;
							}}
							placeholder={`Enter ${varName}`}
						/>
					</div>
				{/each}
			</div>
		</div>
	{:else}
		<p class="mb-4 text-sm text-muted-foreground">
			{m['council.noAgentsConfigured']({ type: 'variables' })}
		</p>
	{/if}

	<!-- Execution Panels -->
	{#if mode === 'single'}
		<div class="space-y-4">
			<Button onclick={runSingle} disabled={running || !allVariablesFilled} class="w-full">
				{#if running}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{m['common.loading']()}
				{:else}
					<Play class="mr-2 h-4 w-4" />
					Run
				{/if}
			</Button>

			{#if error}
				<div
					class="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
				>
					{error}
				</div>
			{/if}

			{#if result}
				<div class="space-y-2">
					<h4 class="text-sm font-medium">Result</h4>
					<Textarea value={result} readonly rows={10} class="font-mono text-sm" />
				</div>
			{/if}
		</div>
	{:else if mode === 'review'}
		<CouncilReviewPanel {promptId} userPrompt={template} />
	{:else if mode === 'debate'}
		<CouncilDebatePanel {promptId} topic={m['prompts.edit']()} resolvedInput={processedContent()} />
	{/if}
</section>
