<script lang="ts">
	import { RadioGroup as RadioGroupPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';

	let { class: className, value = $bindable(), ...rest }: RadioGroupPrimitive.RootProps = $props();
</script>

<RadioGroupPrimitive.Root bind:value class={cn('grid gap-2', className)} {...rest}>
	<slot />
</RadioGroupPrimitive.Root>
