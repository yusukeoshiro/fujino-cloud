<script lang="ts">
	import { cn } from "$lib/utils";

	let className: string | undefined | null = undefined;
	export { className as class };
</script>

<span
	class={cn("ml-auto text-xs tracking-widest opacity-60", className)}
	{...$$restProps}
>
	<slot />
</span>
