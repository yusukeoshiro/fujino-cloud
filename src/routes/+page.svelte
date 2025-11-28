<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	// eslint-disable-next-line svelte/no-navigation-without-resolve
	onMount(() => goto('/login'));
</script>
