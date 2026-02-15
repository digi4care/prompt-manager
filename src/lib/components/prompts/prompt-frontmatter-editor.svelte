<script lang="ts">
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Textarea } from '$lib/components/ui/textarea';
	import { cn } from '$lib/utils';
	import type { FrontmatterDefaults } from '$lib/opencode/frontmatter';
	import { validateFrontmatter } from '$lib/opencode/frontmatter';

	interface Props {
		frontmatterYaml?: string;
		allowedModels?: string[];
		defaults?: FrontmatterDefaults;
		disabled?: boolean;
		class?: string;
	}

	let {
		frontmatterYaml = $bindable(''),
		allowedModels,
		defaults,
		disabled = false,
		class: className = ''
	}: Props = $props();

	let validation = $derived(validateFrontmatter(frontmatterYaml, { allowedModels, defaults }));

	let preview = $derived.by(() => {
		const c = validation.config;
		return [
			`model: ${c.model ?? ''}`,
			`temperature: ${c.temperature ?? ''}`,
			`max_tokens: ${c.max_tokens ?? ''}`
		].join('\n');
	});

	let extrasCount = $derived.by(() => Object.keys(validation.extras || {}).length);
</script>

<Card class={cn('border-dashed', className)} data-testid="frontmatter-card">
	<CardHeader>
		<CardTitle>Frontmatter</CardTitle>
		<CardDescription>
			OpenCode runtime config stored per version (YAML). Unknown keys are allowed.
		</CardDescription>
	</CardHeader>
	<CardContent class="space-y-3">
		<div class="space-y-2">
			<Textarea
				id="frontmatter-yaml"
				data-testid="frontmatter-yaml"
				rows={8}
				class="font-mono text-sm"
				bind:value={frontmatterYaml}
				{disabled}
				placeholder="model: openai/gpt-4o-mini\ntemperature: 0.7\nmax_tokens: 2048"
			/>

			{#if !validation.ok}
				<div
					role="alert"
					data-testid="frontmatter-errors"
					class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
				>
					<ul class="list-disc pl-5">
						{#each validation.errors as err}
							<li>{err}</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>

		<div class="grid gap-3 md:grid-cols-2">
			<div class="rounded-md border bg-muted/30 p-3">
				<div class="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
					Preview
				</div>
				<pre data-testid="frontmatter-preview" class="font-mono text-xs whitespace-pre-wrap">
{preview}
				</pre>
			</div>

			<div class="rounded-md border bg-muted/30 p-3">
				<div class="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
					Extras
				</div>
				<div data-testid="frontmatter-extras" class="text-sm">
					{extrasCount} key{extrasCount === 1 ? '' : 's'}
				</div>
			</div>
		</div>
	</CardContent>
</Card>
