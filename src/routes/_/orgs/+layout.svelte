<script lang="ts">
	import { deviceToken } from '$lib/stores/device-token.store';
	import { type Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet<[]> } = $props();

	const applyToken = (token: string | null) => {
		deviceToken.set(token ?? null);
	};

	applyToken(data.deviceToken ?? null);

	$effect(() => {
		applyToken(data.deviceToken ?? null);
	});
</script>

{@render children?.()}
