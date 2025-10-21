<script lang="ts">
	import { currentUser } from '$lib/current-user';
	import { auth } from '$lib/firebase';
	import { onAuthStateChanged, signOut } from 'firebase/auth';
	import { goto } from '$app/navigation';
	import { currentMembers } from '$lib/stores/members.store';
	import { onMount, type Snippet } from 'svelte';
	import type { PageData } from './$types';
	import { page } from '$app/state';

	let { children, data }: { children: Snippet<[]>; data: PageData } = $props();

	async function logout() {
		try {
			await signOut(auth);
			console.log('🚪 Logged out');

			await fetch('/api/session', { method: 'DELETE' });

			goto('/login'); // ✅ redirect to login page
		} catch (err) {
			console.error('Logout failed:', err);
		}
	}

	onMount(() => {
		if (data.members) {
			currentMembers.set(data.members);
		}

		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
			} else {
				logout();
			}
		});

		// ✅ Cleanup on unmount
		return () => unsubscribe();
	});
</script>

<div class="w-full bg-white shadow">
	<div class="mx-auto flex max-w-5xl items-center justify-between gap-2 p-4">
		<!-- Left: logo + links -->
		<div class="flex items-center gap-4">
			<a href="/_/" class="font-bold text-gray-800">
				<img src="/logo.png" alt="藤野クラウド ロゴ" class="h-28" />
			</a>

			{#if $currentMembers.length > 0 && page.params.oid}
				<a
					href={`/_/orgs/${page.params.oid}/gps-analysis`}
					class="text-gray-600 hover:text-gray-900"
				>
					GPSデータの分析
				</a>
			{/if}
		</div>

		<!-- Right: user info + logout -->
		<div class="flex items-center gap-3 text-sm text-gray-700">
			{#if $currentUser}
				<span>こんにちは、{$currentUser.displayName || $currentUser.email} さん</span>
				<button
					type="button"
					onclick={logout}
					class="rounded-lg border border-gray-300 bg-white px-3 py-1 text-gray-700 shadow-sm transition hover:bg-gray-100 hover:text-gray-900 focus:ring-2 focus:ring-gray-300 focus:outline-none"
				>
					ログアウト
				</button>
			{:else}
				<button
					type="button"
					class="rounded-lg border border-gray-300 bg-white px-3 py-1 text-gray-700 shadow-sm transition hover:bg-gray-100 hover:text-gray-900 focus:ring-2 focus:ring-gray-300 focus:outline-none"
					disabled
				>
					ログアウト
				</button>
			{/if}
		</div>
	</div>

	{#if $currentMembers.length >= 2 && page.params.oid == null}
		<div class="mx-auto flex max-w-5xl items-center justify-between gap-2 p-4">
			<div class="flex gap-2">
				{#each $currentMembers as member}
					<a href={`/_/orgs/${member.orgId}`}>
						{member.name}
					</a>
				{/each}
			</div>
		</div>
	{/if}
</div>

<div class="p-3">
	{@render children?.()}
</div>
