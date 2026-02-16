<script lang="ts">
	import { Tabs as TabsPrimitive } from 'bits-ui';

	let {
		value = $bindable(),
		class: className,
		children,
		...rest
	}: TabsPrimitive.RootProps = $props();
</script>

<TabsPrimitive.Root bind:value class={className} {...rest}>
	{@render children?.()}
</TabsPrimitive.Root>
