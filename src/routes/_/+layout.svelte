<script lang="ts">
	import { currentUser } from '$lib/current-user';
	import { auth } from '$lib/firebase';
	import { onAuthStateChanged, signOut, updateEmail, updateProfile } from 'firebase/auth';
	import { goto } from '$app/navigation';
	import { currentMembers } from '$lib/accessors/members.store';
	import { onMount, tick, type Snippet } from 'svelte';
	import type { PageData } from './$types';
	import { page } from '$app/state';
	import { locale, setLocale, supportedLocales, t, type Locale } from '$lib/i18n';

	const menus = [
		{
			path: (oid: string) => `/_/orgs/${oid}/gps-conditioning`,
			labelKey: 'layout.menu.gpsConditioning',
		},
		{
			path: (oid: string) => `/_/orgs/${oid}/settings`,
			labelKey: 'layout.menu.orgSettings',
		},
	];

	let { children, data }: { children: Snippet<[]>; data: PageData } = $props();
	let members = $derived(data.members ?? []);
	const activeOrg = $derived(
		page.params.oid ? $currentMembers.find((member) => member.orgId === page.params.oid) : null,
	);

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

	const isActive = (href: string) => page.url.pathname.startsWith(href);

	let showProfile = $state(false);
	let profileName = $state('');
	let profileEmail = $state('');
	let profileSaving = $state(false);
	let profileEditing = $state(false);
	let profileNotice = $state<{ tone: 'success' | 'error'; text: string } | null>(null);
	let editFocus = $state<'name' | 'email' | null>(null);
	let nameInputEl = $state<HTMLInputElement | null>(null);
	let emailInputEl = $state<HTMLInputElement | null>(null);

	const navigateToOnlyOrg = (currentOrgId: string | null) => {
		if (currentOrgId == null) {
			if (members.length === 1) {
				// eslint-disable-next-line svelte/no-navigation-without-resolve
				goto(`/_/orgs/${members[0].orgId}`);
			}
		}
	};

	const syncProfileDraft = () => {
		if (!$currentUser) return;
		profileName = $currentUser.displayName ?? '';
		profileEmail = $currentUser.email ?? '';
	};

	$effect(() => {
		if ($currentUser) {
			syncProfileDraft();
		}
	});

	$effect(() => {
		if (!profileEditing || !editFocus) return;
		void tick().then(() => {
			const target = editFocus === 'name' ? nameInputEl : emailInputEl;
			target?.focus();
			target?.select?.();
			editFocus = null;
		});
	});

	const isValidEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value);

	const saveProfile = async () => {
		if (!$currentUser) return;
		profileNotice = null;
		const nextName = profileName.trim();
		const nextEmail = profileEmail.trim();
		if (!nextEmail || !isValidEmail(nextEmail)) {
			profileNotice = { tone: 'error', text: $t('profile.emailInvalid') };
			return;
		}
		const tasks: Promise<void>[] = [];
		if (nextName !== ($currentUser.displayName ?? '')) {
			tasks.push(updateProfile($currentUser, { displayName: nextName }));
		}
		if (nextEmail !== ($currentUser.email ?? '')) {
			tasks.push(updateEmail($currentUser, nextEmail));
		}
		if (!tasks.length) {
			profileNotice = { tone: 'success', text: $t('profile.noChanges') };
			return;
		}
		profileSaving = true;
		try {
			await Promise.all(tasks);
			if (auth.currentUser) {
				currentUser.set(auth.currentUser);
			}
			profileNotice = { tone: 'success', text: $t('profile.updateSuccess') };
		} catch (error) {
			const code = (error as { code?: string }).code;
			profileNotice = {
				tone: 'error',
				text:
					code === 'auth/requires-recent-login'
						? $t('profile.reauthRequired')
						: $t('profile.updateFailed'),
			};
			syncProfileDraft();
		} finally {
			profileSaving = false;
		}
	};

	const toggleProfile = () => {
		showProfile = !showProfile;
		profileNotice = null;
		profileEditing = false;
		if (showProfile) {
			syncProfileDraft();
		}
	};

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

<!-- eslint-disable svelte/no-navigation-without-resolve -->
<div class="w-full bg-white shadow">
	<div class="mx-auto flex max-w-5xl items-center justify-between gap-2 p-4">
		<!-- Left: logo + links -->
		<div class="flex items-center gap-4">
			<img src="/logo.png" alt={$t('app.logoAlt')} class="h-28" />

			{#if page.params.oid}
				{#each menus as menu (menu.labelKey)}
					{#if $currentMembers.length > 0 && page.params.oid}
						{#key menu.labelKey}
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
							<a
								href={menu.path(page.params.oid)}
								class={`border-b-2 pb-0.5 transition-colors ${isActive(menu.path(page.params.oid)) ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
							>
								{$t(menu.labelKey)}
							</a>
						{/key}
					{/if}
				{/each}
			{/if}
		</div>

		<div class="flex items-center gap-3 text-sm text-gray-700">
			<!-- Right: org switcher + user info + logout -->
			{#if $currentMembers.length}
				<div class="flex items-center gap-2">
					{#if activeOrg}
						<div class="rounded-lg bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
							{activeOrg.name}
						</div>
					{/if}
					{#if $currentMembers.length > 1}
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
						<a
							href="/_/"
							class="rounded-lg border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-700 transition hover:border-blue-400 hover:bg-blue-50"
						>
							{$t('layout.changeOrg')}
						</a>
					{/if}
				</div>
			{/if}

			{#if $currentUser}
				<span class="hidden sm:inline">
					{$t('layout.greeting', {
						name: $currentUser.displayName || $currentUser.email || '',
					})}
				</span>
				<div class="relative z-[70]">
					<button
						type="button"
						class="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
						onclick={toggleProfile}
						aria-haspopup="dialog"
						aria-expanded={showProfile}
						title={$t('profile.open')}
					>
						{#if $currentUser?.photoURL}
							<img
								src={$currentUser.photoURL}
								alt={$t('profile.open')}
								class="h-full w-full object-cover"
							/>
						{:else}
							<svg
								class="h-5 w-5 text-slate-400"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.6"
								aria-hidden="true"
							>
								<path stroke-linecap="round" stroke-linejoin="round" d="M20 21a8 8 0 1 0-16 0" />
								<circle cx="12" cy="8" r="4" />
							</svg>
						{/if}
					</button>
					{#if showProfile}
						<button
							type="button"
							class="fixed inset-0 z-[70] cursor-default"
							aria-label={$t('profile.close')}
							onclick={() => (showProfile = false)}
						></button>
						<div
							class="absolute top-full right-0 z-[80] mt-3 w-80 rounded-2xl border border-slate-200 bg-white p-4 text-slate-800 shadow-xl"
						>
							<div class="flex items-start gap-3">
								<div
									class="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-slate-100"
								>
									{#if $currentUser?.photoURL}
										<img
											src={$currentUser.photoURL}
											alt={$t('profile.open')}
											class="h-full w-full object-cover"
										/>
									{:else}
										<svg
											class="h-6 w-6 text-slate-400"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="1.6"
											aria-hidden="true"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M20 21a8 8 0 1 0-16 0"
											/>
											<circle cx="12" cy="8" r="4" />
										</svg>
									{/if}
								</div>
								<div class="flex-1">
									<p class="text-sm font-semibold text-slate-900">
										{profileName || $t('profile.unknown')}
									</p>
									<p class="text-xs text-slate-500">{profileEmail}</p>
								</div>
							</div>

							{#if profileNotice}
								<div
									class={`mt-3 rounded-lg border px-3 py-2 text-xs ${
										profileNotice.tone === 'success'
											? 'border-emerald-200 bg-emerald-50 text-emerald-700'
											: 'border-rose-200 bg-rose-50 text-rose-700'
									}`}
								>
									{profileNotice.text}
								</div>
							{/if}

							{#if !profileEditing}
								<div class="mt-4 space-y-3 text-sm">
									<div class="group flex items-start justify-between gap-3">
										<div>
											<p class="text-xs font-semibold text-slate-600">
												{$t('profile.nameLabel')}
											</p>
											<p class="text-sm text-slate-800">{profileName || '—'}</p>
										</div>
										<button
											type="button"
											class="rounded-md p-1 text-slate-400 opacity-0 transition group-hover:opacity-100 hover:text-slate-600"
											onclick={() => {
												profileEditing = true;
												editFocus = 'name';
												syncProfileDraft();
											}}
											aria-label={$t('profile.edit')}
										>
											<svg
												class="h-3.5 w-3.5"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="1.8"
												aria-hidden="true"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M15.232 5.232a2.5 2.5 0 0 1 3.536 3.536L8 19l-4 1 1-4 10.232-10.232z"
												/>
											</svg>
										</button>
									</div>
									<div class="group flex items-start justify-between gap-3">
										<div>
											<p class="text-xs font-semibold text-slate-600">
												{$t('profile.emailLabel')}
											</p>
											<p class="text-sm text-slate-800">{profileEmail || '—'}</p>
										</div>
										<button
											type="button"
											class="rounded-md p-1 text-slate-400 opacity-0 transition group-hover:opacity-100 hover:text-slate-600"
											onclick={() => {
												profileEditing = true;
												editFocus = 'email';
												syncProfileDraft();
											}}
											aria-label={$t('profile.edit')}
										>
											<svg
												class="h-3.5 w-3.5"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="1.8"
												aria-hidden="true"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M15.232 5.232a2.5 2.5 0 0 1 3.536 3.536L8 19l-4 1 1-4 10.232-10.232z"
												/>
											</svg>
										</button>
									</div>
								</div>
							{:else}
								<div class="mt-4 space-y-3 text-sm">
									<div class="space-y-1">
										<label class="text-xs font-semibold text-slate-600" for="profile-name">
											{$t('profile.nameLabel')}
										</label>
										<input
											id="profile-name"
											type="text"
											class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
											bind:value={profileName}
											bind:this={nameInputEl}
										/>
									</div>
									<div class="space-y-1">
										<label class="text-xs font-semibold text-slate-600" for="profile-email">
											{$t('profile.emailLabel')}
										</label>
										<input
											id="profile-email"
											type="email"
											class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
											bind:value={profileEmail}
											bind:this={emailInputEl}
										/>
									</div>
								</div>
							{/if}
							<div class="mt-4 space-y-1 text-sm">
								<label
									class="flex items-center gap-1.5 text-xs font-semibold text-slate-600"
									for="profile-language"
								>
									<svg
										class="h-3.5 w-3.5"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="1.8"
										aria-hidden="true"
									>
										<circle cx="12" cy="12" r="9" />
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"
										/>
									</svg>
									{$t('profile.languageLabel')}
								</label>
								<select
									id="profile-language"
									class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
									value={$locale}
									onchange={(event) => {
										const target = event.currentTarget as HTMLSelectElement;
										setLocale(target.value as Locale);
									}}
								>
									{#each supportedLocales as option (option)}
										<option value={option}>{$t(`settings.language.${option}`)}</option>
									{/each}
								</select>
							</div>

							{#if profileEditing}
								<div class="mt-4 flex items-center justify-end gap-2">
									<button
										type="button"
										class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
										onclick={() => {
											profileEditing = false;
											syncProfileDraft();
										}}
									>
										{$t('profile.cancel')}
									</button>
									<button
										type="button"
										class="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
										onclick={saveProfile}
										disabled={profileSaving}
									>
										{profileSaving ? $t('profile.saving') : $t('profile.save')}
									</button>
								</div>
							{/if}
						</div>
					{/if}
				</div>
				<button
					type="button"
					onclick={logout}
					class="rounded-lg border border-gray-300 bg-white px-3 py-1 text-gray-700 shadow-sm transition hover:bg-gray-100 hover:text-gray-900 focus:ring-2 focus:ring-gray-300 focus:outline-none"
				>
					{$t('layout.logout')}
				</button>
			{:else}
				<button
					type="button"
					class="rounded-lg border border-gray-300 bg-white px-3 py-1 text-gray-700 shadow-sm transition hover:bg-gray-100 hover:text-gray-900 focus:ring-2 focus:ring-gray-300 focus:outline-none"
					disabled
				>
					{$t('layout.logout')}
				</button>
			{/if}
		</div>
	</div>
</div>

<div class="p-3">
	{@render children?.()}
</div>

{#if $currentMembers.length >= 2 && page.params.oid == null}
	<div class="mx-auto max-w-5xl px-4 py-6">
		<div class="rounded-xl border border-blue-100 bg-blue-50/60 p-6 text-center shadow-sm">
			<p class="text-sm font-medium text-blue-900">{$t('layout.selectOrgPrompt')}</p>
			<div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each $currentMembers as member (member.orgId)}
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
					<a
						href={`/_/orgs/${member.orgId}`}
						class="flex items-center justify-center rounded-lg border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-blue-700 transition hover:border-blue-400 hover:bg-blue-50"
					>
						{member.name}
					</a>
				{/each}
			</div>
		</div>
	</div>
{/if}
