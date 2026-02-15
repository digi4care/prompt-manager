<script lang="ts">
  import { toasts, type Toast } from './store';
  import ToastComponent from './toast.svelte';
  import { Button } from '$lib/components/ui/button';
</script>

<div
  class="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-4 sm:right-4 sm:flex-col md:max-w-[420px]"
  aria-live="polite"
  aria-atomic="false"
>
  {#each $toasts.toasts as toast (toast.id)}
    <ToastComponent {toast}>
      <div class="flex gap-2">
        {#if toast.action}
          <button
            class="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            onclick={() => toast.action?.onClick?.()}
          >
            {toast.action.label}
          </button>
        {/if}
        <Button
          variant="ghost"
          size="sm"
          onclick={() => toasts.remove(toast.id)}
        >
          Dismiss
        </Button>
      </div>
    </ToastComponent>
  {/each}
</div>
