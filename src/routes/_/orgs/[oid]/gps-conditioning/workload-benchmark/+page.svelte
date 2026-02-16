<script lang="ts">
	import type { PageData } from './$types';
	import {
		type WorkloadBenchmarkColumn,
		type WorkloadBenchmarkValues,
		entriesFromValuesMap,
		valuesMapFromEntries,
	} from './columns';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import jspreadsheet from 'jspreadsheet-ce';
	import 'jspreadsheet-ce/dist/jspreadsheet.css';
	import { onDestroy, onMount } from 'svelte';

	let { data }: { data: PageData } = $props();

	const columns: WorkloadBenchmarkColumn[] = data.columns;
	const orgId = data.orgId;

	// Create a stable reference to values that doesn't trigger reactivity loops unnecessarily
	let values = $state<WorkloadBenchmarkValues>({ ...data.values });

	let saving = $state(false);
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let lastSavedToken = $state<string | null>(null);
	type Banner = { text: string; tone: 'success' | 'error' } | null;
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let notification = $state<Banner>(null);

	let spreadsheetContainer: HTMLDivElement;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let spreadsheetInstance: any = null;

	const translate = (key: string, vars?: Record<string, string | number>) => get(t)(key, vars);

	const saveChanges = async () => {
		saving = true;
		notification = null;

		try {
			const response = await fetch(
				`/api/gps-conditioning/workload-benchmark/set?orgId=${encodeURIComponent(orgId)}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						values: entriesFromValuesMap(values),
					}),
				},
			);

			if (!response.ok) {
				throw new Error('API error');
			}

			const payload = await response.json();
			if (payload?.values) {
				values = valuesMapFromEntries(payload.values);
			}
			const savedAt = payload?.savedAt ?? new Date().toISOString();
			lastSavedToken = savedAt;

			notification = {
				text: translate('gps.workloadBenchmark.saved'),
				tone: 'success',
			};
		} catch (error) {
			console.error('Failed to save workload benchmark', error);
			notification = {
				text: translate('gps.workloadBenchmark.saveFailed'),
				tone: 'error',
			};
		} finally {
			saving = false;
		}
	};

	const sanitizeInput = (value: string) =>
		value
			.replace(/\u00a0/g, ' ')
			.replace(/\r/g, '')
			.replace(/\n/g, '')
			.replace(/\t/g, ' ')
			.trim();

	const numericPattern = /^-?\d*(?:\.\d*)?$/;
	const isValidNumericInput = (value: string) => value === '' || numericPattern.test(value);

	const initSpreadsheet = () => {
		if (!spreadsheetContainer) return;
		if (spreadsheetInstance) {
			try {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				jspreadsheet.destroy(spreadsheetContainer as any, true);
			} catch (e) {
				console.warn(e);
			}
			spreadsheetInstance = null;
		}

		// Prepare data: single row array
		const rowData = columns.map((col) => values[col.key] ?? '');
		const dataArray = [rowData];

		// Prepare columns config
		const columnsConfig = columns.map((col) => ({
			type: 'text' as const, // Using text to allow empty strings and custom validation/sanitization
			title: col.label,
			width: 150,
		}));

		spreadsheetInstance = jspreadsheet(spreadsheetContainer, {
			worksheets: [
				{
					data: dataArray,
					columns: columnsConfig,
					minDimensions: [columns.length, 1],
					allowInsertRow: false,
					allowManualInsertRow: false,
					allowInsertColumn: false,
					allowManualInsertColumn: false,
					allowDeleteRow: false,
					allowDeleteColumn: false,
				},
			],
			contextMenu: () => [], // Disable context menu
			onchange: async (instance, cell, x, y, value) => {
				const colIndex = parseInt(String(x));
				const column = columns[colIndex];
				if (!column) return;

				const valStr = String(value);
				const sanitized = sanitizeInput(valStr);

				// Validate
				if (!isValidNumericInput(sanitized)) {
					// Revert change if invalid
					// Note: setValue might trigger onchange again if not careful, but usually secure
					// For jspreadsheet, we might need to reset the cell value visually
					spreadsheetInstance.setValueFromCoords(
						colIndex,
						parseInt(String(y)),
						values[column.key] ?? '',
						false,
					);
					return;
				}

				// Update local state
				values = {
					...values,
					[column.key]: sanitized,
				};

				// Trigger save
				await saveChanges();
			},
		});
	};

	onMount(() => {
		initSpreadsheet();
	});

	onDestroy(() => {
		if (spreadsheetInstance) {
			try {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				jspreadsheet.destroy(spreadsheetContainer as any, true);
			} catch (e) {
				// ignore
			}
		}
	});
</script>

<div class="mx-auto flex max-w-screen-2xl flex-col gap-4 px-4 py-6 text-slate-900">
	<!-- Header -->
	<div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
		<div>
			<h1 class="text-xl font-semibold">{$t('gps.workloadBenchmark.title')}</h1>
			<p class="text-slate-600">{$t('gps.workloadBenchmark.description')}</p>
		</div>
		<div class="flex items-center gap-2">
			<!-- Save status indicator -->
			{#if saving}
				<span class="text-sm text-slate-500">{$t('gps.workloadBenchmark.saving')}</span>
			{:else if notification?.tone === 'success'}
				<span class="text-sm text-emerald-600">{$t('gps.workloadBenchmark.saved')}</span>
			{:else if notification?.tone === 'error'}
				<span class="text-sm text-red-600">{$t('gps.workloadBenchmark.saveFailed')}</span>
			{/if}
		</div>
	</div>

	<!-- Hints -->
	<ul class="flex flex-wrap gap-4 text-sm text-slate-600">
		<li>{$t('gps.workloadBenchmark.tipMove')}</li>
		<li>{$t('gps.workloadBenchmark.tipPaste')}</li>
		<li>{$t('gps.workloadBenchmark.tipShared')}</li>
	</ul>

	<!-- Spreadsheet Container -->
	<div class="overflow-auto rounded-xl border border-slate-300 bg-slate-50 p-1 shadow-inner">
		<div bind:this={spreadsheetContainer}></div>
	</div>
</div>

<style>
	/* Override jspreadsheet styles to match the theme if necessary */
	:global(.jexcel) {
		font-family: inherit;
	}
	:global(.jexcel > thead > tr > td) {
		background-color: #f8fafc; /* bg-slate-50 */
		color: #1e293b; /* text-slate-800 */
		font-weight: 600;
	}
</style>
