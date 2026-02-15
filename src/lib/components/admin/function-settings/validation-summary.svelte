<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		errors: Record<string, Record<string, string>>;
		class?: string;
	}

	let { errors, class: className = '' }: Props = $props();

	// Flatten errors for display
	let errorList = $derived(() => {
		const list: Array<{ functionType: string; field: string; message: string }> = [];
		for (const [functionType, fieldErrors] of Object.entries(errors)) {
			for (const [field, message] of Object.entries(fieldErrors)) {
				list.push({ functionType, field, message });
			}
		}
		return list;
	});

	let hasErrors = $derived(Object.keys(errors).length > 0);
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
				<ul class="mt-2 space-y-1">
					{#each errorList() as error}
						<li class="text-sm text-destructive">
							<span class="font-medium capitalize">{error.functionType}</span>
							{#if error.functionType.startsWith('agent-')}
								<span class="text-muted-foreground"> (Council)</span>
							{/if}
							: {error.message}
						</li>
					{/each}
				</ul>
			</div>
		</div>
	</div>
{/if}
