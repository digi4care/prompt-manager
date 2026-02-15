<script lang="ts">
  import { cn } from '$lib/utils';
  import type { Toast, ToastVariant } from './store';

  let {
    toast,
    children
  } = $props<{
    toast: Toast;
    children?: any;
  }>();

  const variantStyles: Record<ToastVariant, string> = {
    default: 'bg-background text-foreground border-border',
    success: 'bg-green-100 text-green-900 border-green-300 dark:bg-green-900/50 dark:text-green-100 dark:border-green-700',
    destructive: 'bg-destructive text-destructive-foreground border-destructive',
    warning: 'bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-100 dark:border-yellow-700',
    info: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/50 dark:text-blue-100 dark:border-blue-700',
  };

  let toastVariant: ToastVariant = $derived(toast.variant || 'default');
</script>

<div
  class={cn(
    "pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all",
    "animate-in slide-in-from-bottom-5 fade-in-0 duration-300",
    "data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-bottom-full",
    variantStyles[toastVariant]
  )}
  role="alert"
  aria-live="polite"
>
  <div class="grid gap-1">
    {#if toast.title}
      <div class="text-sm font-semibold">{toast.title}</div>
    {/if}
    {#if toast.description}
      <div class="text-sm opacity-90">{toast.description}</div>
    {/if}
  </div>

  {#if children}
    {@render children()}
  {/if}
</div>
