<script lang="ts">
  import { cn } from '$lib/utils';

  let {
    class: className = '',
    children,
    ...restProps
  } = $props<{
    class?: string;
    children?: any;
    [key: string]: any;
  }>();
</script>

<h2 class={cn('text-lg font-semibold leading-none tracking-tight', className)} {...restProps}>
  {@render children?.()}
</h2>
