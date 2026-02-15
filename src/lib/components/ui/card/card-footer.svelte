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

<div class={cn('flex items-center p-6 pt-0', className)} {...restProps}>
  {@render children?.()}
</div>
