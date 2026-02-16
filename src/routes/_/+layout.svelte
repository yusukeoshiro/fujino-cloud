<script lang="ts">
	import { currentUser } from '$lib/current-user';
	import { auth } from '$lib/firebase';
	import { onAuthStateChanged, signOut } from 'firebase/auth'; // removed updateEmail, updateProfile as they are moved to UserNav
	import { goto } from '$app/navigation';
	import { currentMembers } from '$lib/accessors/members.store';
	import { onMount, type Snippet } from 'svelte';
	import type { PageData } from './$types';
	import { page } from '$app/state';
	import { t } from '$lib/i18n'; // removed locale, setLocale, supportedLocales, type Locale as they are moved to UserNav
    import SiteHeader from '$lib/components/site-header.svelte';

	let { children, data }: { children: Snippet<[]>; data: PageData } = $props();
	let members = $derived(data.members ?? []);
	
    // activeOrg logic is now inside OrgSwitcher and MainNav, 
    // but we still need navigateToOnlyOrg logic.

	$effect(() => {
		navigateToOnlyOrg(page.params.oid);
	});

	const logout = async () => {
		try {
			await signOut(auth);
			console.log('🚪 Logged out');

			await fetch('/api/session', { method: 'DELETE' });

			// eslint-disable-next-line svelte/no-navigation-without-resolve
			goto('/login'); // ✅ redirect to login page
		} catch (err) {
			console.error('Logout failed:', err);
		}
	};
    
    // Profile state management moved to UserNav

	const navigateToOnlyOrg = (currentOrgId: string | null) => {
		if (currentOrgId == null) {
			if (members.length === 1) {
				// eslint-disable-next-line svelte/no-navigation-without-resolve
				goto(`/_/orgs/${members[0].orgId}`);
			}
		}
	};

    // onMount logic for auth state change and member setting
	onMount(() => {
		if (members) {
			currentMembers.set(members);
			navigateToOnlyOrg(page.params.oid);
		}

		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				// do nothing
			} else {
				logout();
			}
		});

		// ✅ Cleanup on unmount
		return () => unsubscribe();
	});
</script>

<SiteHeader />

<div class="p-3">
	{@render children?.()}
</div>


