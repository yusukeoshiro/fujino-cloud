<script lang="ts">
	import { page } from '$app/state';
	import type { PageData } from './$types';
	import { locale, t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import { Button } from '$lib/components/ui/button';

	let { data }: { data: PageData } = $props();

	const orgId = page.params.oid;

	let contentsProviderApiToken = $state({
		hasToken: data.contentsProviderApiToken?.hasToken ?? false,
		lastFour: data.contentsProviderApiToken?.lastFour ?? null,
		updatedAt: data.contentsProviderApiToken?.updatedAt ?? null,
	});
	let contentsProviderIssuedToken = $state<string | null>(null);
	let contentsProviderBanner = $state<{ text: string; tone: 'success' | 'error' } | null>(null);
	let isIssuingContentsProvider = $state(false);
	let isDeletingContentsProvider = $state(false);

	const translate = (key: string, vars?: Record<string, string | number>) => get(t)(key, vars);

	const ensureOrg = () => {
		if (!orgId) {
			throw new Error(translate('settings.contentsToken.orgMissing'));
		}
	};

	const formatTimestamp = (value: string | null) =>
		value ? new Date(value).toLocaleString($locale) : null;

	const renewContentsProviderToken = async () => {
		ensureOrg();
		isIssuingContentsProvider = true;
		contentsProviderBanner = null;
		contentsProviderIssuedToken = null;
		try {
			const response = await fetch(
				`/api/orgs/${encodeURIComponent(orgId)}/contents-provider-api-token`,
				{
					method: 'POST',
				},
			);
			const result = await response.json();
			if (!response.ok || !result?.token) {
				throw new Error(translate('settings.contentsToken.issueFailed'));
			}

			contentsProviderApiToken = {
				hasToken: true,
				lastFour:
					result.lastFour ?? (typeof result.token === 'string' ? result.token.slice(-4) : null),
				updatedAt: result.updatedAt ?? null,
			};
			contentsProviderIssuedToken = result.token;
			contentsProviderBanner = {
				text: translate('settings.contentsToken.issued'),
				tone: 'success',
			};
		} catch (error) {
			console.error(error);
			contentsProviderBanner = {
				text:
					error instanceof Error ? error.message : translate('settings.contentsToken.issueFailed'),
				tone: 'error',
			};
		} finally {
			isIssuingContentsProvider = false;
		}
	};

	const deleteContentsProviderToken = async () => {
		ensureOrg();
		isDeletingContentsProvider = true;
		contentsProviderBanner = null;
		try {
			const response = await fetch(
				`/api/orgs/${encodeURIComponent(orgId)}/contents-provider-api-token`,
				{
					method: 'DELETE',
				},
			);
			const result = await response.json();
			if (!response.ok || !result?.success) {
				throw new Error(translate('settings.contentsToken.deleteFailed'));
			}
			contentsProviderApiToken = {
				hasToken: false,
				lastFour: null,
				updatedAt: null,
			};
			contentsProviderIssuedToken = null;
			contentsProviderBanner = {
				text: translate('settings.contentsToken.deleted'),
				tone: 'success',
			};
		} catch (error) {
			console.error(error);
			contentsProviderBanner = {
				text:
					error instanceof Error ? error.message : translate('settings.contentsToken.deleteFailed'),
				tone: 'error',
			};
		} finally {
			isDeletingContentsProvider = false;
		}
	};
</script>

{#if contentsProviderBanner}
	<div
		class={`rounded-md border px-4 py-3 text-sm ${
			contentsProviderBanner.tone === 'success'
				? 'border-emerald-300 bg-emerald-50 text-emerald-800'
				: 'border-rose-300 bg-rose-50 text-rose-800'
		}`}
	>
		{contentsProviderBanner.text}
	</div>
{/if}

<div class="rounded-xl border border-slate-200 bg-white shadow-sm">
	<div class="border-b border-slate-100 px-6 py-4">
		<div class="flex items-center justify-between">
			<div>
				<h2 class="text-lg font-medium text-slate-900">Mobili Platform → Fujino Cloud</h2>
				<p class="text-sm text-slate-500">
					{$t('settings.contentsToken.description')}
				</p>
			</div>
			<div
				class={`rounded-full px-3 py-1 text-xs font-semibold ${
					contentsProviderApiToken.hasToken
						? 'bg-emerald-100 text-emerald-700'
						: 'bg-slate-100 text-slate-500'
				}`}
			>
				{contentsProviderApiToken.hasToken
					? $t('settings.contentsToken.issuedStatus')
					: $t('settings.contentsToken.unissuedStatus')}
			</div>
		</div>
		{#if contentsProviderApiToken.updatedAt}
			<p class="mt-3 text-xs text-slate-400">
				{$t('settings.contentsToken.lastUpdated', {
					timestamp: formatTimestamp(contentsProviderApiToken.updatedAt) ?? '',
				})}
				{#if contentsProviderApiToken.lastFour}
					{$t('settings.contentsToken.lastFour', {
						lastFour: contentsProviderApiToken.lastFour,
					})}
				{/if}
			</p>
		{/if}
	</div>

	<div class="space-y-6 px-6 py-6">
		<div class="flex flex-wrap items-center gap-3">
			<Button
				type="button"
				onclick={renewContentsProviderToken}
				class="bg-indigo-600 hover:bg-indigo-700 text-white"
				disabled={isIssuingContentsProvider}
			>
				{isIssuingContentsProvider
					? $t('settings.contentsToken.issuing')
					: contentsProviderApiToken.hasToken
						? $t('settings.contentsToken.reissue')
						: $t('settings.contentsToken.issue')}
			</Button>
			{#if contentsProviderApiToken.hasToken}
				<Button
					type="button"
					variant="outline"
					onclick={deleteContentsProviderToken}
					class="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
					disabled={isDeletingContentsProvider}
				>
					{isDeletingContentsProvider
						? $t('settings.contentsToken.deleting')
						: $t('settings.contentsToken.delete')}
				</Button>
			{/if}
		</div>

		{#if contentsProviderIssuedToken}
			<div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
				<p class="text-sm font-medium text-amber-800">
					{$t('settings.contentsToken.warning')}
				</p>
				<div
					class="mt-2 rounded-md bg-white px-3 py-2 font-mono text-xs text-slate-800 shadow-inner"
				>
					{contentsProviderIssuedToken}
				</div>
			</div>
		{/if}
	</div>
</div>
