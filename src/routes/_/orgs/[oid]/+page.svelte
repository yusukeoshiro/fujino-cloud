<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	onMount(() => {
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(`/_/orgs/${page.params.oid}/gps-conditioning`);
	});
</script>
