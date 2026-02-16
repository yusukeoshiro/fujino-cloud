<script lang="ts">
	import { RadioGroup as RadioGroupPrimitive } from 'bits-ui';
	import { Check } from 'lucide-svelte'; // Or Circle/Dot if preferred, usually Check for cards or Dot for standard radio
	import { cn } from '$lib/utils';

	// Standard radio indicator is a circle, but for choice cards we might want just the indicator or the check.
	// shadcn usually uses a circle indicator.
	let { class: className, ...rest }: RadioGroupPrimitive.ItemProps = $props();
</script>

<RadioGroupPrimitive.Item
	class={cn(
		'aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
		className,
	)}
	children={childrenShim}
	{...rest}
/>

{#snippet childrenShim({ checked })}
	<div class="flex items-center justify-center">
		{#if checked}
			<div class="h-2.5 w-2.5 rounded-full bg-current" />
		{/if}
	</div>
{/snippet}
