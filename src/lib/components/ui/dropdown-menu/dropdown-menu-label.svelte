<script lang="ts">
	import { cn } from '$lib/utils';

	let {
		class: className,
		inset,
		children,
		...rest
	}: { class?: string; inset?: boolean; children?: any } = $props();
</script>

<div class={cn('px-2 py-1.5 text-sm font-semibold', inset && 'pl-8', className)} {...rest}>
	{@render children?.()}
</div>
