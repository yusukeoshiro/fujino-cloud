<script lang="ts">
	import { page } from '$app/state';
	import { deviceTokenAccessor } from '$lib/accessors/device-token.accessor';
	import type { PageData } from './$types';
	import { t } from 'svelte-i18n';
	import { get } from 'svelte/store';

	let { data }: { data: PageData } = $props();

	const orgId = page.params.oid;

	const deviceTokenReady = deviceTokenAccessor.ready;

	const applyToken = (token: string | null) => {
		deviceTokenAccessor.set(token ?? null);
	};

	let deviceLastUpdated = $state<string | null>(data.deviceTokenUpdatedAt ?? null);
	let deviceBanner = $state<{ text: string; tone: 'success' | 'error' } | null>(null);
	let tokenInput = $state<string>('');
	let isSavingDevice = $state(false);
	let isDeletingDevice = $state(false);

	applyToken(data.deviceToken ?? null);

	const ensureOrg = () => {
		if (!orgId) {
			throw new Error(get(t)('device_token.error.no_org'));
		}
	};

	const formatTimestamp = (value: string | null) =>
		value ? new Date(value).toLocaleString() : null;

	const saveDeviceToken = async (event: SubmitEvent) => {
		event.preventDefault();
		try {
			ensureOrg();
			const trimmed = tokenInput.trim();
			if (!trimmed) {
				deviceBanner = { text: get(t)('device_token.error.empty'), tone: 'error' };
				return;
			}
			isSavingDevice = true;
			deviceBanner = null;
			const response = await fetch(`/api/orgs/${encodeURIComponent(orgId)}/device-token`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token: trimmed }),
			});
			const result = await response.json();
			if (!response.ok || !result?.success) {
				throw new Error(result?.message ?? get(t)('device_token.error.save_failed'));
			}
			applyToken(trimmed);
			tokenInput = '';
			deviceLastUpdated = result.updatedAt ?? null;
			deviceBanner = {
				text: result.message ?? get(t)('device_token.success.saved'),
				tone: 'success',
			};
		} catch (error) {
			console.error(error);
			deviceBanner = {
				text: error instanceof Error ? error.message : get(t)('device_token.error.save_failed'),
				tone: 'error',
			};
		} finally {
			isSavingDevice = false;
		}
	};

	const deleteDeviceToken = async () => {
		try {
			ensureOrg();
			isDeletingDevice = true;
			deviceBanner = null;
			const response = await fetch(`/api/orgs/${encodeURIComponent(orgId)}/device-token`, {
				method: 'DELETE',
			});
			const result = await response.json();
			if (!response.ok || !result?.success) {
				throw new Error(result?.message ?? get(t)('device_token.error.delete_failed'));
			}
			applyToken(null);
			tokenInput = '';
			deviceLastUpdated = null;
			deviceBanner = {
				text: result.message ?? get(t)('device_token.success.deleted'),
				tone: 'success',
			};
		} catch (error) {
			console.error(error);
			deviceBanner = {
				text: error instanceof Error ? error.message : get(t)('device_token.error.delete_failed'),
				tone: 'error',
			};
		} finally {
			isDeletingDevice = false;
		}
	};
</script>

{#if deviceBanner}
	<div
		class={`rounded-md border px-4 py-3 text-sm ${
			deviceBanner.tone === 'success'
				? 'border-emerald-300 bg-emerald-50 text-emerald-800'
				: 'border-rose-300 bg-rose-50 text-rose-800'
		}`}
	>
		{deviceBanner.text}
	</div>
{/if}

<div class="rounded-xl border border-slate-200 bg-white shadow-sm">
	<div class="border-b border-slate-100 px-6 py-4">
		<div class="flex items-center justify-between">
			<div>
				<h2 class="text-lg font-medium text-slate-900">{$t('device_token.title')}</h2>
				<p class="text-sm text-slate-500">
					{$t('device_token.description')}
				</p>
			</div>
			<div
				class={`rounded-full px-3 py-1 text-xs font-semibold ${
					$deviceTokenReady ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
				}`}
			>
				{$deviceTokenReady ? $t('device_token.registered') : $t('device_token.not_registered')}
			</div>
		</div>
		{#if deviceLastUpdated}
			<p class="mt-3 text-xs text-slate-400">
				<!-- eslint-disable-next-line @typescript-eslint/no-explicit-any -->
				{$t('device_token.last_updated', { date: formatTimestamp(deviceLastUpdated) } as any)}
			</p>
		{/if}
	</div>

	<div class="space-y-6 px-6 py-6">
		<form class="space-y-4" onsubmit={saveDeviceToken}>
			<div class="flex flex-col gap-2">
				<label for="token" class="text-sm font-medium text-slate-700"
					>{$t('device_token.label')}</label
				>
				<input
					id="token"
					name="token"
					bind:value={tokenInput}
					type="text"
					placeholder={$t('device_token.placeholder')}
					class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
					autocomplete="off"
				/>
				<p class="text-xs text-slate-400">
					{$t('device_token.help_text')}
				</p>
			</div>

			<div class="flex flex-wrap items-center gap-3">
				<button
					type="submit"
					class="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 focus:outline-none disabled:cursor-not-allowed disabled:bg-indigo-300"
					disabled={isSavingDevice || !tokenInput.trim()}
				>
					{isSavingDevice ? $t('device_token.saving_button') : $t('device_token.save_button')}
				</button>
			</div>
		</form>
		{#if $deviceTokenReady}
			<button
				type="button"
				onclick={deleteDeviceToken}
				class="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 focus:ring-2 focus:ring-rose-200 focus:ring-offset-1 focus:outline-none disabled:cursor-not-allowed disabled:text-rose-300"
				disabled={isDeletingDevice}
			>
				{isDeletingDevice ? $t('device_token.deleting_button') : $t('device_token.delete_button')}
			</button>
		{/if}
	</div>
</div>
