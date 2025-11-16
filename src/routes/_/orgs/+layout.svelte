<script lang="ts">
	import { deviceTokenAccessor } from '$lib/device-token/device-token-accessor';
	import { type Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet<[]> } = $props();

	const applyToken = (token: string | null) => {
		deviceTokenAccessor.set(token ?? null);
	};

	applyToken(data.deviceToken ?? null);

	$effect(() => {
		applyToken(data.deviceToken ?? null);
	});
</script>

{@render children?.()}
