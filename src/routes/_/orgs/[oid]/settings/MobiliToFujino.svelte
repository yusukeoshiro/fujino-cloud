<script lang="ts">
	import { page } from '$app/state';
	import type { PageData } from './$types';
	import { t } from 'svelte-i18n';
	import { get } from 'svelte/store';

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

	const ensureOrg = () => {
		if (!orgId) {
			throw new Error(get(t)('device_token.error.no_org'));
		}
	};

	const formatTimestamp = (value: string | null) =>
		value ? new Date(value).toLocaleString() : null;

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
				throw new Error(result?.message ?? get(t)('api_token.error.issue_failed'));
			}

			contentsProviderApiToken = {
				hasToken: true,
				lastFour:
					result.lastFour ?? (typeof result.token === 'string' ? result.token.slice(-4) : null),
				updatedAt: result.updatedAt ?? null,
			};
			contentsProviderIssuedToken = result.token;
			contentsProviderBanner = {
				text: result.message ?? get(t)('api_token.success.issued'),
				tone: 'success',
			};
		} catch (error) {
			console.error(error);
			contentsProviderBanner = {
				text: error instanceof Error ? error.message : get(t)('api_token.error.issue_failed'),
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
				throw new Error(result?.message ?? get(t)('api_token.error.delete_failed'));
			}
			contentsProviderApiToken = {
				hasToken: false,
				lastFour: null,
				updatedAt: null,
			};
			contentsProviderIssuedToken = null;
			contentsProviderBanner = {
				text: result.message ?? get(t)('api_token.success.deleted'),
				tone: 'success',
			};
		} catch (error) {
			console.error(error);
			contentsProviderBanner = {
				text: error instanceof Error ? error.message : get(t)('api_token.error.delete_failed'),
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
				: 'border-rose-300 bg-rose-50 text-emerald-800'
		}`}
	>
		{contentsProviderBanner.text}
	</div>
{/if}

<div class="rounded-xl border border-slate-200 bg-white shadow-sm">
	<div class="border-b border-slate-100 px-6 py-4">
		<div class="flex items-center justify-between">
			<div>
				<h2 class="text-lg font-medium text-slate-900">{$t('api_token.title')}</h2>
				<p class="text-sm text-slate-500">
					{$t('api_token.description')}
				</p>
			</div>
			<div
				class={`rounded-full px-3 py-1 text-xs font-semibold ${
					contentsProviderApiToken.hasToken
						? 'bg-emerald-100 text-emerald-700'
						: 'bg-slate-100 text-slate-500'
				}`}
			>
				{contentsProviderApiToken.hasToken ? $t('api_token.issued') : $t('api_token.not_issued')}
			</div>
		</div>
		{#if contentsProviderApiToken.updatedAt}
			<p class="mt-3 text-xs text-slate-400">
				<!-- eslint-disable @typescript-eslint/no-explicit-any -->
				{$t('api_token.last_updated', {
					date: formatTimestamp(contentsProviderApiToken.updatedAt),
				} as any)}
				{#if contentsProviderApiToken.lastFour}
					{$t('api_token.last_four', { lastFour: contentsProviderApiToken.lastFour } as any)}
				{/if}
				<!-- eslint-enable @typescript-eslint/no-explicit-any -->
			</p>
		{/if}
	</div>

	<div class="space-y-6 px-6 py-6">
		<div class="flex flex-wrap items-center gap-3">
			<button
				type="button"
				onclick={renewContentsProviderToken}
				class="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 focus:outline-none disabled:cursor-not-allowed disabled:bg-indigo-300"
				disabled={isIssuingContentsProvider}
			>
				{isIssuingContentsProvider
					? $t('api_token.issuing_button')
					: contentsProviderApiToken.hasToken
						? $t('api_token.reissue_button')
						: $t('api_token.issue_button')}
			</button>
			{#if contentsProviderApiToken.hasToken}
				<button
					type="button"
					onclick={deleteContentsProviderToken}
					class="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 focus:ring-2 focus:ring-rose-200 focus:ring-offset-1 focus:outline-none disabled:cursor-not-allowed disabled:text-rose-300"
					disabled={isDeletingContentsProvider}
				>
					{isDeletingContentsProvider
						? $t('api_token.deleting_button')
						: $t('api_token.delete_button')}
				</button>
			{/if}
		</div>

		{#if contentsProviderIssuedToken}
			<div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
				<p class="text-sm font-medium text-amber-800">
					{$t('api_token.warning')}
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
