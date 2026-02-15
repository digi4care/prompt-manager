<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		errors: Record<string, Record<string, string>>;
		class?: string;
	}

	let { errors, class: className = '' }: Props = $props();

	let groupedErrors = $derived.by(() =>
		Object.entries(errors)
			.filter(([, fieldErrors]) => Object.keys(fieldErrors).length > 0)
			.map(([functionType, fieldErrors]) => ({
				functionType,
				isCouncilAgent: functionType.startsWith('agent-'),
				messages: Object.values(fieldErrors)
			}))
	);

	let hasErrors = $derived(groupedErrors.length > 0);
</script>

{#if hasErrors}
	<div class={cn('rounded-md border border-destructive/50 bg-destructive/10 p-4', className)}>
		<div class="flex items-start gap-3">
			<svg
				class="mt-0.5 h-5 w-5 shrink-0 text-destructive"
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<circle cx="12" cy="12" r="10" />
				<line x1="12" y1="8" x2="12" y2="12" />
				<line x1="12" y1="16" x2="12.01" y2="16" />
			</svg>
			<div class="flex-1">
				<h4 class="text-sm font-medium text-destructive">Validation Errors</h4>
				<p class="mt-1 text-xs text-muted-foreground">
					Please fix the following errors before saving:
				</p>
				<div class="mt-2 space-y-2">
					{#each groupedErrors as group}
						<div>
							<div class="text-sm font-medium text-destructive">
								{#if group.isCouncilAgent}
									Council Agent
								{:else}
									<span class="capitalize">{group.functionType}</span>
								{/if}
							</div>
							<ul class="mt-1 ml-4 list-disc space-y-1">
								{#each group.messages as message}
									<li class="text-sm text-destructive">{message}</li>
								{/each}
							</ul>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}
