<script lang="ts">
	import { t } from '$lib/i18n';
	import type { TrainingBudgetConfig } from '$lib/services/training-budget.service';

	interface Props {
		config: TrainingBudgetConfig;
		monthOptions: { value: number; label: string }[];
		weekStartOptions: { value: number; label: string }[];
		onChange: () => void;
	}

	let { config = $bindable(), monthOptions, weekStartOptions, onChange }: Props = $props();
</script>

<div class="flex flex-col gap-3 sm:flex-row">
	<div>
		<label for="start-month" class="mb-1 block text-sm text-slate-700">
			{$t('gps.budget.startMonth')}
		</label>
		<select
			id="start-month"
			bind:value={config.startMonth}
			onchange={onChange}
			class="rounded-lg border border-slate-300 px-2 py-1"
		>
			{#each monthOptions as option (option.value)}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
	</div>

	<div>
		<label for="week-start" class="mb-1 block text-sm text-slate-700">
			{$t('gps.budget.weekStart')}
		</label>
		<select
			id="week-start"
			bind:value={config.weekStartsOn}
			onchange={onChange}
			class="rounded-lg border border-slate-300 px-2 py-1"
		>
			{#each weekStartOptions as option (option.value)}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
	</div>
</div>
