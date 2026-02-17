<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { PageData } from './$types';
	import { HEADER_COLS } from './utils/headers.util';
	import { locale, t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import {
		CSV_VENDOR_FORMATS,
		DEFAULT_CSV_VENDOR_FORMAT,
		type CsvVendorFormat,
	} from '$lib/csv-processors/vendor-formats';
	import { Button } from '$lib/components/ui/button';
	import { RadioGroup, RadioGroupItem } from '$lib/components/ui/radio-group';
	import { Label } from '$lib/components/ui/label';

	let { data }: { data: PageData } = $props();

	const orgId = page.params.oid;
	const stickyLeft =
		'sticky left-20 z-20 bg-gray-50 after:absolute after:inset-y-0 after:-right-px after:w-px after:bg-gray-200';

	function colStickyClass(col: string) {
		if (HEADER_COLS.includes(col)) return stickyLeft;
		return '';
	}

	function formatNumber(value: number, precision: number | undefined) {
		const digits = typeof precision === 'number' ? precision : 0;
		const factor = 10 ** digits;
		const rounded = Math.round(value * factor) / factor;
		return rounded.toLocaleString($locale, {
			minimumFractionDigits: digits,
			maximumFractionDigits: digits,
		});
	}

	function unitLabel(unit?: string): string {
		switch (unit) {
			case 'CENTIMETER':
				return 'cm';
			case 'KILOGRAM':
				return 'kg';
			case 'COUNT':
				return '回';
			case 'PERCENT':
				return '%';
			case 'METER':
				return 'm';
			case 'SECOND':
				return 's';
			case 'MINUTE':
				return 'min';
			case 'HOUR':
				return 'h';
			case 'KMPH':
				return 'km/h';
			default:
				return '';
		}
	}

	function labelWithUnit(col: UploadPreviewColumn): string {
		const unit = unitLabel(col.unit);
		if (!unit) return col.label;
		if (col.label.includes(`(${unit})`)) return col.label;
		return `${col.label} (${unit})`;
	}

	function fmt(v: unknown, col?: UploadPreviewColumn): string {
		if (v === null || v === undefined || v === '') return '—';
		if (typeof v === 'number' && Number.isFinite(v)) {
			const unit = col?.unit;
			const precision = col?.roundingPrecision;
			const raw = unit === 'PERCENT' ? v * 100 : v;
			const formatted = formatNumber(raw, precision);
			return unit === 'PERCENT' ? `${formatted}%` : formatted;
		}
		return String(v);
	}

	type UploadPreviewRecord = Record<string, unknown> & { __rowIndex: number };
	type UploadPreviewColumn = {
		key: string;
		label: string;
		unit?: string;
		roundingPrecision?: number;
	};
	type UploadPreviewRow = {
		record: UploadPreviewRecord;
		selected: boolean;
	};
	type UploadPreviewResponse = {
		rows: number;
		headers: string[];
		columns: UploadPreviewColumn[];
		records: UploadPreviewRecord[];
		inferredSessionDate?: string | null;
	};

	let isOver = $state(false);
	let uploading = $state(false);
	let committing = $state(false); // ✅ NEW

	let result = $state<UploadPreviewResponse | null>(null);
	type GpsCategory = 'training' | 'game';
	let gpsCategory = $state<GpsCategory>('training');
	let sessionDate = $state<string>('');
	let vendorFormat = $state<CsvVendorFormat>(
		data.defaultCsvVendorFormat ?? DEFAULT_CSV_VENDOR_FORMAT,
	);
	const vendorFormatOptions = CSV_VENDOR_FORMATS;
	let rowSelections = $state<Record<number, boolean>>({});
	let bulkSelectCheckbox: HTMLInputElement | null = $state(null);

	let errorHeadline: string | null = $state(null);
	let errorDetails: string[] = $state([]);
	let fileInput: HTMLInputElement | null = $state(null);
	let lastFile: File | null = $state(null);

	const translate = (key: string, vars?: Record<string, string | number>) => get(t)(key, vars);

	// ✅ post-commit hook (write your logic here)
	function onCommitSuccess() {
		// e.g., show toast / navigate / reset
		// result = null; lastFile = null;
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(`/_/orgs/${page.params.oid}/gps-conditioning`);
	}

	function buildInitialSelections(records: UploadPreviewRecord[] | null | undefined) {
		if (!records) return {};
		const selections: Record<number, boolean> = {};
		for (const record of records) {
			if (record && typeof record.__rowIndex === 'number') {
				selections[record.__rowIndex] = true;
			}
		}
		return selections;
	}

	function toggleSelection(record: UploadPreviewRecord, checked: boolean) {
		if (typeof record.__rowIndex !== 'number') return;
		rowSelections = {
			...rowSelections,
			[record.__rowIndex]: checked,
		};
	}

	function toggleAllRows(selected: boolean) {
		if (!rows.length) return;
		const updated: Record<number, boolean> = { ...rowSelections };
		for (const row of rows) {
			const rowIndex = typeof row.record.__rowIndex === 'number' ? row.record.__rowIndex : -1;
			if (rowIndex >= 0) {
				updated[rowIndex] = selected;
			}
		}
		rowSelections = updated;
	}

	async function uploadFile(file: File) {
		if (!file) return;
		if (!orgId) {
			setError(translate('gps.upload.orgMissing'));
			return;
		}
		setError(null);
		result = null;
		rowSelections = {};
		uploading = true;
		try {
			const fd = new FormData();
			fd.append('file', file);
			fd.append('gpsCategory', gpsCategory);
			fd.append('vendorFormat', vendorFormat);
			if (sessionDate) {
				fd.append('sessionDate', sessionDate);
			}

			const res = await fetch(
				`/api/gps-conditioning/csv/preview?orgId=${encodeURIComponent(orgId)}`,
				{
					method: 'POST',
					body: fd,
				},
			);
			if (!res.ok) {
				const contentType = res.headers.get('content-type') ?? '';
				if (contentType.includes('application/json')) {
					const payload = await res.json();
					const errorDetailsPayload = Array.isArray(payload?.details) ? payload.details : [];
					const err = new Error(translate('gps.upload.failed')) as Error & { details?: unknown };
					err.details = errorDetailsPayload;
					throw err;
				}
				throw new Error(translate('gps.upload.failed'));
			}
			const payload = (await res.json()) as UploadPreviewResponse;
			result = payload;
			if (!sessionDate && payload.inferredSessionDate) {
				sessionDate = payload.inferredSessionDate;
			}
			rowSelections = buildInitialSelections(payload.records);
		} catch (e: unknown) {
			const details: string[] = [];
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const rawDetails = (e as any)?.details;
			if (Array.isArray(rawDetails)) {
				for (const item of rawDetails) {
					if (typeof item === 'string') {
						details.push(item);
					} else if (
						item &&
						typeof item === 'object' &&
						'description' in item &&
						typeof item.description === 'string'
					) {
						details.push(item.description);
					} else if (
						item &&
						typeof item === 'object' &&
						('row' in item || 'playerName' in item || 'jerseyNo' in item)
					) {
						const row =
							typeof (item as { row?: unknown }).row === 'number'
								? translate('gps.upload.issueRow', { row: (item as { row: number }).row })
								: '';
						const playerName =
							typeof (item as { playerName?: unknown }).playerName === 'string'
								? translate('gps.upload.issuePlayer', {
										playerName: (item as { playerName: string }).playerName,
									})
								: '';
						const jerseyNo =
							typeof (item as { jerseyNo?: unknown }).jerseyNo === 'string'
								? translate('gps.upload.issueJersey', {
										jerseyNo: (item as { jerseyNo: string }).jerseyNo,
									})
								: '';
						const parts = [row, playerName, jerseyNo].filter(Boolean);
						if (parts.length) {
							details.push(parts.join(' '));
						}
					}
				}
			}
			setError(
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				typeof (e as any)?.message === 'string'
					? // eslint-disable-next-line @typescript-eslint/no-explicit-any
						(e as any).message
					: translate('gps.upload.failed'),
				details,
			);
		} finally {
			uploading = false;
		}
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isOver = false;
		const file = e.dataTransfer?.files?.[0] ?? null;
		if (file) {
			lastFile = file; // <-- remember
			uploadFile(file); // preview
		}
	}

	function onDragOver(e: DragEvent) {
		e.preventDefault();
		e.dataTransfer!.dropEffect = 'copy';
		isOver = true;
	}

	function onDragLeave(e: DragEvent) {
		e.preventDefault();
		isOver = false;
	}

	function onPick(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0] ?? null;
		if (file) {
			lastFile = file; // <-- remember
			uploadFile(file); // preview
		}
	}

	// --- Async Job Handling ---
	import { doc, onSnapshot } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { onDestroy } from 'svelte';

	let jobId = $state<string | null>(null);
	let jobStatus = $state<'PROCESSING' | 'COMPLETED' | 'ERROR' | null>(null);
	let jobStage = $state<'PARTICIPANTS' | 'METRICS' | 'EXPORTING' | null>(null);
	let jobProgress = $state<{ processed: number; total: number }>({ processed: 0, total: 0 });
	let unsubscribeJob: (() => void) | null = null;

	onDestroy(() => {
		if (unsubscribeJob) unsubscribeJob();
	});

	let jobMessage = $state<string>('');

	function listenToJob(id: string) {
		if (unsubscribeJob) unsubscribeJob();
		const ref = doc(db, 'gps-upload-status', id);

		jobMessage = translate('gps.upload.committing');

		unsubscribeJob = onSnapshot(ref, (snap) => {
			if (!snap.exists()) return;
			const data = snap.data();
			jobStatus = data.status;
			jobStage = data.stage;
			if (data.totalRows) {
				jobProgress = { processed: data.processedRows ?? 0, total: data.totalRows };
			}

			// Update message based on stage
			if (data.status === 'PROCESSING') {
				if (jobStage === 'PARTICIPANTS') jobMessage = `Importing Members...`;
				else if (jobStage === 'METRICS')
					jobMessage = `Importing Metrics (${Math.floor((jobProgress.processed / jobProgress.total) * 100)}%)...`;
				else if (jobStage === 'EXPORTING') jobMessage = `Finalizing...`;
				else jobMessage = translate('gps.upload.committing');
			} else if (data.status === 'COMPLETED') {
				committing = false;
				if (unsubscribeJob) unsubscribeJob();

				if (data.errorDetails?.length > 0) {
					jobMessage = translate('gps.upload.successWithErrors');
					setError(jobMessage, data.errorDetails);
				} else {
					jobMessage = translate('gps.upload.success');
					onCommitSuccess();
				}
			} else if (data.status === 'ERROR') {
				committing = false;
				if (unsubscribeJob) unsubscribeJob();
				jobMessage = data.errorMessage || translate('gps.upload.commitFailed');
				// Collect all details
				const details = data.errorDetails || [];
				setError(jobMessage, details);
				jobId = null;
			}
		});
	}

	async function commitUpload() {
		if (!lastFile) {
			setError(translate('gps.upload.selectFileFirst'));
			return;
		}
		if (!orgId) {
			setError(translate('gps.upload.orgMissing'));
			return;
		}
		if (!sessionDate) {
			setError(translate('gps.upload.dateRequired'));
			return;
		}
		committing = true; // ✅ start spinner
		setError(null);
		try {
			const fd = new FormData();
			fd.append('file', lastFile);
			fd.append('gpsCategory', gpsCategory);
			fd.append('vendorFormat', vendorFormat);
			fd.append('sessionDate', sessionDate);
			const selectedRowIndices = Object.entries(rowSelections)
				.filter(([, selected]) => selected)
				.map(([index]) => Number(index))
				.filter((index) => Number.isFinite(index))
				.sort((a, b) => a - b);
			fd.append('selectedRowIndices', JSON.stringify(selectedRowIndices));
			const res = await fetch(
				`/api/gps-conditioning/csv/commit?orgId=${encodeURIComponent(orgId)}`,
				{
					method: 'POST',
					body: fd,
				},
			);
			if (!res.ok) throw new Error(translate('gps.upload.commitFailed'));

			const { jobId: id } = await res.json();
			jobId = id;
			listenToJob(id);
		} catch (e: unknown) {
			committing = false;
			setError(
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				typeof (e as any)?.message === 'string'
					? // eslint-disable-next-line @typescript-eslint/no-explicit-any
						(e as any).message
					: translate('gps.upload.commitFailed'),
			);
		}
	}

	const hideTeamAverage = true;

	// ✅ compute rows reactively (no {#let})
	const emptyRows: UploadPreviewRow[] = [];
	let rows = $derived<UploadPreviewRow[]>(
		result && Array.isArray(result.records)
			? (hideTeamAverage
					? result.records.filter((r: UploadPreviewRecord) => {
							const name = r['Player Name'];
							return !(typeof name === 'string' && name === 'Team Average');
						})
					: result.records
				).map((record) => {
					const rowIndex = typeof record.__rowIndex === 'number' ? record.__rowIndex : -1;
					const selected = rowIndex >= 0 ? (rowSelections[rowIndex] ?? true) : true;
					return { record, selected };
				})
			: emptyRows,
	);

	const allRowsSelected = $derived(rows.length > 0 && rows.every((row) => row.selected));
	const someRowsSelected = $derived(rows.some((row) => row.selected) && !allRowsSelected);
	const columns = $derived(result?.columns ?? []);

	$effect(() => {
		if (bulkSelectCheckbox) {
			bulkSelectCheckbox.indeterminate = someRowsSelected;
		}
	});

	function setError(message: string | null, extraDetails: string[] = []) {
		if (!message) {
			errorHeadline = null;
			errorDetails = [];
			return;
		}
		const lines = message
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean);
		const headline = lines.shift();
		errorHeadline = headline ?? message;
		errorDetails = [...lines, ...extraDetails];
	}

	function resetPreview() {
		setError(null);
		result = null;
		rowSelections = {};
		lastFile = null;
		if (fileInput) {
			fileInput.value = '';
		}
	}
</script>

<section class="mx-auto max-w-screen-2xl px-4 py-6 text-slate-900">
	<header class="mb-6 space-y-2">
		<h1 class="text-xl font-semibold">{$t('gps.upload.title')}</h1>
		<p class="text-sm text-slate-600">{$t('gps.upload.description')}</p>
	</header>

	<div
		class="mb-6 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm"
	>
		<div>
			<p class="text-sm font-semibold text-slate-800">{$t('gps.upload.dataType')}</p>
		</div>
		<RadioGroup bind:value={gpsCategory} class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<!-- Training Option -->
			<Label
				for="option-training"
				class="flex cursor-pointer flex-row items-center justify-between rounded-lg border-2 border-muted bg-transparent p-4 hover:bg-slate-50 [&:has([data-state=checked])]:border-primary"
			>
				<div class="space-y-1">
					<p class="text-sm leading-none font-medium">{$t('gps.upload.type.training')}</p>
					<p class="text-xs text-muted-foreground">{$t('gps.upload.type.training.description')}</p>
				</div>
				<RadioGroupItem value="training" id="option-training" />
			</Label>

			<!-- Game Option -->
			<Label
				for="option-game"
				class="flex cursor-pointer flex-row items-center justify-between rounded-lg border-2 border-muted bg-transparent p-4 hover:bg-slate-50 [&:has([data-state=checked])]:border-primary"
			>
				<div class="space-y-1">
					<p class="text-sm leading-none font-medium">{$t('gps.upload.type.game')}</p>
					<p class="text-xs text-muted-foreground">{$t('gps.upload.type.game.description')}</p>
				</div>
				<RadioGroupItem value="game" id="option-game" />
			</Label>
		</RadioGroup>
		<div class="mt-3 grid gap-3 sm:grid-cols-2">
			<label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
				<span>{$t('gps.upload.sessionDate')}</span>
				<input
					type="date"
					class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
					bind:value={sessionDate}
				/>
			</label>
			<label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
				<span>{$t('gps.upload.vendorFormat')}</span>
				<select
					class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
					bind:value={vendorFormat}
				>
					{#each vendorFormatOptions as option (option)}
						<option value={option}>{option}</option>
					{/each}
				</select>
			</label>
		</div>
	</div>

	{#if !result}
		<!-- Hot spot / dropzone -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="cursor-pointer rounded-2xl border-2 border-dashed bg-white/40 p-10 text-center transition
						select-none hover:bg-white/70
						{isOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}"
			ondrop={onDrop}
			ondragover={onDragOver}
			ondragleave={onDragLeave}
			onclick={() => fileInput?.click()}
		>
			<p class="mb-2 font-semibold text-slate-800">{$t('gps.upload.dropTitle')}</p>
			<p class="text-sm text-slate-500">{$t('gps.upload.dropSubtitle')}</p>
			<input
				bind:this={fileInput}
				type="file"
				accept=".csv,text/csv"
				class="hidden"
				onchange={onPick}
			/>
		</div>
	{/if}

	{#if result}
		<div class="mt-6 space-y-1">
			<h2 class="text-lg font-semibold">{$t('gps.upload.analysisTitle')}</h2>
			<p class="text-sm text-slate-600">
				{$t('gps.upload.analysisDetected', { format: vendorFormat })}
			</p>
		</div>
	{/if}

	{#if uploading}
		<p class="mt-4 flex items-center gap-2 text-sm text-slate-600">
			<!-- inline spinner -->
			<svg class="h-4 w-4 animate-spin text-blue-600" viewBox="0 0 24 24" aria-hidden="true">
				<circle
					cx="12"
					cy="12"
					r="10"
					stroke="currentColor"
					stroke-width="4"
					fill="none"
					opacity="0.25"
				/>
				<path
					d="M22 12a10 10 0 0 1-10 10"
					fill="none"
					stroke="currentColor"
					stroke-width="4"
					stroke-linecap="round"
				/>
			</svg>
			{$t('gps.upload.uploading')}
		</p>
	{/if}

	{#if errorHeadline}
		<div class="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
			<p class="font-semibold">{errorHeadline}</p>
			{#if errorDetails.length}
				<ul class="mt-2 list-disc space-y-1 pl-5 text-sm">
					{#each errorDetails as detail, i (i)}
						<li>{detail}</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}

	{#if result}
		<div class="mt-6 space-y-4">
			<div>
				<p class="font-medium text-slate-700">{$t('gps.upload.summary')}</p>
				<p class="text-sm text-slate-600">
					{$t('gps.upload.rows', { rows: result.rows })}
				</p>
			</div>

			<!-- Data table -->
			{#if rows.length}
				<div class="overflow-auto rounded-xl border border-slate-200 shadow-sm">
					<table class="min-w-full border-collapse text-sm text-slate-900">
						<thead class="sticky top-0 z-10 bg-slate-50">
							<tr>
								<th
									class="sticky left-0 z-30 w-20 min-w-[5rem] bg-slate-50 px-3 py-2 text-center font-semibold whitespace-nowrap text-slate-700"
								>
									<div class="flex items-center justify-center gap-2">
										<input
											type="checkbox"
											bind:this={bulkSelectCheckbox}
											class="h-4 w-4 accent-blue-600"
											checked={allRowsSelected}
											onchange={(event) =>
												toggleAllRows((event.target as HTMLInputElement).checked)}
											disabled={!rows.length || uploading || committing}
											aria-label={$t('gps.upload.toggleAllPlayers')}
										/>
										<nobr>{$t('gps.upload.includeInCalc')}</nobr>
									</div>
								</th>
								{#each columns as col (col.key)}
									<th
										class={'px-3 py-2 text-left font-semibold whitespace-nowrap text-slate-700 ' +
											colStickyClass(col.key)}
									>
										<nobr>
											{labelWithUnit(col)}
										</nobr>
									</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each rows as row, i (i)}
								<tr class="{i % 2 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50">
									<td class="sticky left-0 z-20 w-20 min-w-[5rem] bg-inherit px-3 py-2 text-center">
										<input
											type="checkbox"
											class="h-4 w-4 accent-blue-600"
											checked={row.selected}
											onchange={(event) =>
												toggleSelection(row.record, (event.target as HTMLInputElement).checked)}
											aria-label={$t('gps.upload.includePlayer')}
										/>
									</td>
									{#each columns as col (col.key)}
										<td class={'bg-inherit px-3 py-2 tabular-nums ' + colStickyClass(col.key)}>
											<nobr>
												{fmt(row.record[col.key], col)}
											</nobr>
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="text-sm text-slate-500">{$t('gps.upload.noRecords')}</p>
			{/if}
		</div>

		<div class="mt-6 flex flex-col items-center gap-3">
			<div class="flex flex-col items-center gap-3 sm:flex-row">
				<Button
					type="button"
					variant="outline"
					class="flex h-auto items-center gap-2 rounded-2xl px-5 py-3 transition disabled:cursor-not-allowed disabled:opacity-60"
					onclick={resetPreview}
					disabled={!result || uploading || committing}
				>
					{$t('gps.upload.retry')}
				</Button>
				<Button
					type="button"
					variant="default"
					class="flex h-auto items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
					onclick={commitUpload}
					disabled={!lastFile || uploading || committing}
					aria-busy={committing}
				>
					{#if committing}
						<svg class="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" aria-hidden="true">
							<circle
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
								fill="none"
								opacity="0.25"
							/>
							<path
								d="M22 12a10 10 0 0 1-10 10"
								fill="none"
								stroke="currentColor"
								stroke-width="4"
								stroke-linecap="round"
							/>
						</svg>
						{$t('gps.upload.committing')}
					{:else}
						{$t('gps.upload.commit')}
					{/if}
				</Button>
			</div>
			{#if committing && jobMessage}
				<div class="mt-2 animate-pulse text-center text-sm font-medium text-slate-600">
					{jobMessage}
				</div>
			{/if}
		</div>
	{/if}
</section>

<style>
	.tabular-nums {
		font-variant-numeric: tabular-nums;
	}
	thead th,
	tbody td {
		border-bottom: 1px solid #e5e7eb;
	}
</style>
