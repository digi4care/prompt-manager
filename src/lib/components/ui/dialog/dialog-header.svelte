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

<div class={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...restProps}>
  {@render children?.()}
</div>
