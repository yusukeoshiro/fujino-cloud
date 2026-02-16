<script lang="ts">
	import { Popover as PopoverPrimitive } from "bits-ui";
	import { cn } from "$lib/utils";

	let {
		children,
		class: className,
		...rest
	}: PopoverPrimitive.TriggerProps = $props();
</script>

<PopoverPrimitive.Trigger class={className} {...rest}>
	{@render children?.()}
</PopoverPrimitive.Trigger>
