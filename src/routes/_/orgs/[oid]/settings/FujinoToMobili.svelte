<script lang="ts">
	import { page } from '$app/state';
	import { deviceTokenAccessor } from '$lib/accessors/device-token.accessor';
	import type { PageData } from './$types';
	import { locale, t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import { Button } from '$lib/components/ui/button';

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

	const translate = (key: string, vars?: Record<string, string | number>) => get(t)(key, vars);

	applyToken(data.deviceToken ?? null);

	const ensureOrg = () => {
		if (!orgId) {
			throw new Error(translate('settings.deviceToken.orgMissing'));
		}
	};

	const formatTimestamp = (value: string | null) =>
		value ? new Date(value).toLocaleString($locale) : null;

	const saveDeviceToken = async (event: SubmitEvent) => {
		event.preventDefault();
		ensureOrg();
		const trimmed = tokenInput.trim();
		if (!trimmed) {
			deviceBanner = { text: translate('settings.deviceToken.enterToken'), tone: 'error' };
			return;
		}
		isSavingDevice = true;
		deviceBanner = null;
		try {
			const response = await fetch(`/api/orgs/${encodeURIComponent(orgId)}/device-token`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token: trimmed }),
			});
			const result = await response.json();
			if (!response.ok || !result?.success) {
				throw new Error(translate('settings.deviceToken.saveFailed'));
			}
			applyToken(trimmed);
			tokenInput = '';
			deviceLastUpdated = result.updatedAt ?? null;
			deviceBanner = {
				text: translate('settings.deviceToken.saved'),
				tone: 'success',
			};
		} catch (error) {
			console.error(error);
			deviceBanner = {
				text: error instanceof Error ? error.message : translate('settings.deviceToken.saveFailed'),
				tone: 'error',
			};
		} finally {
			isSavingDevice = false;
		}
	};

	const deleteDeviceToken = async () => {
		ensureOrg();
		isDeletingDevice = true;
		deviceBanner = null;
		try {
			const response = await fetch(`/api/orgs/${encodeURIComponent(orgId)}/device-token`, {
				method: 'DELETE',
			});
			const result = await response.json();
			if (!response.ok || !result?.success) {
				throw new Error(translate('settings.deviceToken.deleteFailed'));
			}
			applyToken(null);
			tokenInput = '';
			deviceLastUpdated = null;
			deviceBanner = {
				text: translate('settings.deviceToken.deleted'),
				tone: 'success',
			};
		} catch (error) {
			console.error(error);
			deviceBanner = {
				text:
					error instanceof Error ? error.message : translate('settings.deviceToken.deleteFailed'),
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
				<h2 class="text-lg font-medium text-slate-900">Fujino Cloud → Mobili Platform</h2>
				<p class="text-sm text-slate-500">
					{$t('settings.deviceToken.description')}
				</p>
			</div>
			<div
				class={`rounded-full px-3 py-1 text-xs font-semibold ${
					$deviceTokenReady ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
				}`}
			>
				{$deviceTokenReady
					? $t('settings.deviceToken.registered')
					: $t('settings.deviceToken.unregistered')}
			</div>
		</div>
		{#if deviceLastUpdated}
			<p class="mt-3 text-xs text-slate-400">
				{$t('settings.deviceToken.lastUpdated', {
					timestamp: formatTimestamp(deviceLastUpdated) ?? '',
				})}
			</p>
		{/if}
	</div>

	<div class="space-y-6 px-6 py-6">
		<form class="space-y-4" onsubmit={saveDeviceToken}>
			<div class="flex flex-col gap-2">
				<label for="token" class="text-sm font-medium text-slate-700">
					{$t('settings.deviceToken.label')}
				</label>
				<input
					id="token"
					name="token"
					bind:value={tokenInput}
					type="text"
					placeholder="device_xxxxxxxx"
					class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
					autocomplete="off"
				/>
				<p class="text-xs text-slate-400">
					{$t('settings.deviceToken.helper')}
				</p>
			</div>

			<div class="flex flex-wrap items-center gap-3">
				<Button
					type="submit"
					class="bg-indigo-600 text-white hover:bg-indigo-700"
					disabled={isSavingDevice || !tokenInput.trim()}
				>
					{isSavingDevice ? $t('settings.deviceToken.saving') : $t('settings.deviceToken.save')}
				</Button>
			</div>
		</form>
		{#if $deviceTokenReady}
			<Button
				type="button"
				variant="outline"
				onclick={deleteDeviceToken}
				class="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
				disabled={isDeletingDevice}
			>
				{isDeletingDevice ? $t('settings.deviceToken.deleting') : $t('settings.deviceToken.delete')}
			</Button>
		{/if}
	</div>
</div>
