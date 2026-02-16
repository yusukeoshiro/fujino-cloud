<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import { CSV_VENDOR_FORMATS } from '$lib/csv-processors/vendor-formats';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import { Button } from '$lib/components/ui/button';

	let { data }: { data: PageData } = $props();

	let selectedFormat = $state<string>(data.organization?.defaultCsvVendorFormat ?? '');
	let banner = $state<{ text: string; tone: 'success' | 'error' } | null>(null);
	let isSaving = $state(false);

	const translate = (key: string, vars?: Record<string, string | number>) => get(t)(key, vars);
</script>

{#if banner}
	<div
		class={`rounded-md border px-4 py-3 text-sm ${
			banner.tone === 'success'
				? 'border-emerald-300 bg-emerald-50 text-emerald-800'
				: 'border-rose-300 bg-rose-50 text-rose-800'
		}`}
	>
		{banner.text}
	</div>
{/if}

<div class="rounded-xl border border-slate-200 bg-white shadow-sm">
	<div class="border-b border-slate-100 px-6 py-4">
		<h2 class="text-lg font-medium text-slate-900">{$t('settings.gps.title')}</h2>
		<p class="text-sm text-slate-500">{$t('settings.gps.description')}</p>
	</div>

	<div class="space-y-6 px-6 py-6">
		<form
			method="POST"
			action="?/updateGpsConfig"
			use:enhance={() => {
				isSaving = true;
				banner = null;
				return async ({ update, result }) => {
					await update();
					isSaving = false;
					if (result.type === 'success') {
						banner = { text: translate('settings.gps.saved'), tone: 'success' };
					} else {
						const isInvalid =
							result.type === 'failure' &&
							result.data &&
							'gpsInvalidFormat' in result.data &&
							result.data.gpsInvalidFormat;
						banner = {
							text: translate(isInvalid ? 'settings.gps.invalidFormat' : 'settings.gps.saveFailed'),
							tone: 'error',
						};
					}
				};
			}}
			class="space-y-4"
		>
			<div class="flex flex-col gap-2">
				<label for="defaultCsvVendorFormat" class="text-sm font-medium text-slate-700">
					{$t('settings.gps.vendorFormat.label')}
				</label>
				<select
					id="defaultCsvVendorFormat"
					name="defaultCsvVendorFormat"
					bind:value={selectedFormat}
					class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
					disabled={isSaving}
				>
					<option value="">{$t('settings.gps.vendorFormat.none')}</option>
					{#each CSV_VENDOR_FORMATS as option (option)}
						<option value={option}>{option}</option>
					{/each}
				</select>
				<p class="text-xs text-slate-400">{$t('settings.gps.vendorFormat.helper')}</p>
			</div>

			<div class="flex flex-wrap items-center gap-3">
				<Button
					type="submit"
					class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
					disabled={isSaving}
				>
					{isSaving ? $t('settings.gps.saving') : $t('settings.gps.save')}
				</Button>
			</div>
		</form>
	</div>
</div>
