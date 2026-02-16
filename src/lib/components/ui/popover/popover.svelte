<script lang="ts">
	import { Popover as PopoverPrimitive } from "bits-ui";

	let {
		children,
		open = $bindable(false),
		...rest
	}: PopoverPrimitive.RootProps = $props();
</script>

<PopoverPrimitive.Root bind:open {...rest}>
	{@render children?.()}
</PopoverPrimitive.Root>
