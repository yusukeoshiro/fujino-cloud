<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.png';
	import { onMount } from 'svelte';
	import { onAuthStateChanged } from 'firebase/auth';
	import { auth } from '$lib/firebase';
	import { currentUser } from '$lib/current-user';
	import { initLocale } from '$lib/i18n';

	import { Toaster } from 'svelte-sonner';

	let { children } = $props();

	onMount(() => {
		initLocale();
		const unsubscribe = onAuthStateChanged(auth, (user) => {
			currentUser.set(user);
		});
		return () => unsubscribe();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<Toaster />
{@render children?.()}
