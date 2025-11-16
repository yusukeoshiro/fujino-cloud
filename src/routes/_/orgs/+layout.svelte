<script lang="ts">
	import { setDeviceTokenValue } from '$lib/device-token/accessor';
	import { type Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet<[]> } = $props();

	const applyToken = (token: string | null) => {
		setDeviceTokenValue(token ?? null);
	};

	applyToken(data.deviceToken ?? null);

	$effect(() => {
		applyToken(data.deviceToken ?? null);
	});
</script>

{@render children?.()}
