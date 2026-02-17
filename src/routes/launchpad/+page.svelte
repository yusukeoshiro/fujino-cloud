<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getAuth, signInWithCustomToken } from 'firebase/auth';
	import { Loader2 } from 'lucide-svelte';

	let error = $state<string | null>(null);

	onMount(async () => {
		const token = page.url.searchParams.get('token');
		const targetUrl = page.url.searchParams.get('targetUrl') || '/';

		if (!token) {
			error = 'Missing authentication token';
			return;
		}

		try {
			const auth = getAuth();
			await signInWithCustomToken(auth, token);
			// Redirect to target URL
			console.log('Successfully signed in. Redirecting to:', targetUrl);
			// Use goto for client-side navigation or window.location if full reload needed
			// Since authentication state changes, a full reload might be safer to ensure all stores update correctly,
			// but goto should work with Firebase Auth listener.
			// Let's try goto first.
			await goto(targetUrl, { replaceState: true });
		} catch (e: any) {
			console.error('Sign-in error:', e);
			error = e.message || 'Failed to sign in';
		}
	});
</script>

<div class="flex h-screen w-full flex-col items-center justify-center bg-slate-50">
	{#if error}
		<div class="max-w-md rounded-lg border border-red-200 bg-white p-6 text-center shadow-lg">
			<h1 class="mb-2 text-xl font-semibold text-red-600">Authentication Failed</h1>
			<p class="text-slate-600">{error}</p>
			<a
				href="/"
				class="mt-4 inline-block rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
			>
				Go Home
			</a>
		</div>
	{:else}
		<div class="flex flex-col items-center gap-4">
			<Loader2 class="h-10 w-10 animate-spin text-slate-400" />
			<p class="text-lg font-medium text-slate-600">Signing you in...</p>
		</div>
	{/if}
</div>
