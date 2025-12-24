<script lang="ts">
	import '../app.css';
	import '$lib/i18n';
	import { isLoading } from 'svelte-i18n';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { onAuthStateChanged } from 'firebase/auth';
	import { auth } from '$lib/firebase';
	import { currentUser } from '$lib/current-user';

	let { children } = $props();

	onMount(() => {
		const unsubscribe = onAuthStateChanged(auth, (user) => {
			currentUser.set(user);
		});
		return () => unsubscribe();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if $isLoading}
	<div>Loading...</div>
{:else}
	{@render children?.()}
{/if}
