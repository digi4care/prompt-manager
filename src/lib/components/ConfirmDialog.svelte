<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { X, Loader2 } from 'lucide-svelte';

	interface Props {
		/** Dialog title */
		title: string;
		/** Dialog message */
		message: string;
		/** Whether the dialog is open */
		open: boolean;
		/** Confirm button text */
		confirmText?: string;
		/** Cancel button text */
		cancelText?: string;
		/** Loading state for confirm action */
		loading?: boolean;
		/** Variant for confirm button */
		variant?: 'default' | 'destructive';
		/** Callback when confirm clicked */
		onconfirm: () => void;
		/** Callback when cancel clicked or dialog closed */
		oncancel: () => void;
	}

	let {
		title,
		message,
		open,
		confirmText = 'Confirm',
		cancelText = 'Cancel',
		loading = false,
		variant = 'destructive',
		onconfirm,
		oncancel
	}: Props = $props();
</script>

{#if open}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
		onclick={oncancel}
		onkeydown={(e) => e.key === 'Escape' && oncancel()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="confirm-dialog-title"
		aria-describedby="confirm-dialog-description"
	>
		<!-- Dialog -->
		<div
			class="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg"
			role="document"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="mb-4 flex items-center justify-between">
				<h3 id="confirm-dialog-title" class="text-lg font-semibold">{title}</h3>
				<button
					type="button"
					onclick={oncancel}
					class="rounded p-1 transition-colors hover:bg-muted"
					aria-label="Close"
					disabled={loading}
				>
					<X class="h-4 w-4" />
				</button>
			</div>

			<!-- Message -->
			<p id="confirm-dialog-description" class="mb-6 text-sm text-muted-foreground">
				{message}
			</p>

			<!-- Actions -->
			<div class="flex justify-end gap-2">
				<Button variant="outline" onclick={oncancel} disabled={loading}>
					{cancelText}
				</Button>
				<Button {variant} onclick={onconfirm} disabled={loading}>
					{#if loading}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					{confirmText}
				</Button>
			</div>
		</div>
	</div>
{/if}
