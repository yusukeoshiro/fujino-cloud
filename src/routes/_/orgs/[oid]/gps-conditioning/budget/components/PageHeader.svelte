<script lang="ts">
	import { t } from '$lib/i18n';

	interface Props {
		currentYear: number;
		loadingYear: boolean;
		saving: boolean;
		autoSaving: boolean;
		onChangeYear: (offset: number) => void;
		onSave: () => void;
	}

	let { currentYear, loadingYear, saving, autoSaving, onChangeYear, onSave }: Props = $props();
</script>

<header class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
	<div>
		<h1 class="text-xl font-semibold">{$t('gps.budget.title')}</h1>
		<p class="text-slate-600">{$t('gps.budget.description')}</p>
	</div>
	<div class="flex items-center gap-2">
		<button
			type="button"
			class="rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
			onclick={() => onChangeYear(-1)}
			disabled={loadingYear}
		>
			{$t('gps.budget.prevYear')}
		</button>

		<span class="font-semibold">{$t('gps.budget.fiscalYear', { year: currentYear })}</span>

		<button
			type="button"
			class="rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
			onclick={() => onChangeYear(1)}
			disabled={loadingYear}
		>
			{$t('gps.budget.nextYear')}
		</button>

		<button
			type="button"
			class="rounded-lg bg-blue-600 px-3 py-2 text-white disabled:bg-slate-400"
			onclick={onSave}
			disabled={saving || autoSaving}
		>
			{saving
				? $t('gps.budget.saving')
				: autoSaving
					? $t('gps.budget.autoSaving')
					: $t('gps.budget.save')}
		</button>
	</div>
</header>
