<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils';

  let { children, trigger } = $props<{
    children: Snippet;
    trigger?: Snippet;
  }>();

  let open = $state(false);

  function toggle() {
    open = !open;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      open = false;
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      open = false;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Trigger wrapper -->
<span onclick={toggle} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && toggle()}>
  {#if trigger}
    {@render trigger()}
  {/if}
</span>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Backdrop -->
    <button
      class="fixed inset-0 bg-black/50 border-0 cursor-default w-full h-full"
      onclick={handleBackdropClick}
      type="button"
      aria-label="Close dialog"
    ></button>

    <!-- Content -->
    <div class={cn(
      "relative z-50 w-full max-w-lg rounded-lg bg-background p-6 shadow-lg"
    )}>
      {@render children()}
    </div>
  </div>
{/if}
