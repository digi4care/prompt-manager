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

<div class={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)} {...restProps}>
  {@render children?.()}
</div>
