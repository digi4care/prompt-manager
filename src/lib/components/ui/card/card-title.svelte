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

<h3 class={cn('text-2xl font-semibold leading-none tracking-tight', className)} {...restProps}>
  {@render children?.()}
</h3>
