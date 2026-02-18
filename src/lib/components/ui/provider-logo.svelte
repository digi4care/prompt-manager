<script lang="ts">
	import { cn } from '$lib/utils';

	let {
		providerId,
		name,
		size = 'md',
		class: className = ''
	}: {
		providerId: string;
		name?: string;
		size?: 'sm' | 'md' | 'lg';
		class?: string;
	} = $props();

	const sizeClasses = {
		sm: 'h-4 w-4',
		md: 'h-6 w-6',
		lg: 'h-8 w-8'
	};
</script>

<img
	src="/logos/{providerId}.svg"
	alt="{name || providerId} logo"
	class={cn('object-contain dark:invert', sizeClasses[size], className)}
	onerror={(e) => {
		const target = e.currentTarget as HTMLImageElement;
		target.style.display = 'none';
	}}
/>
