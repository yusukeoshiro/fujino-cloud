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

	let { data }: { data: PageData } = $props();

	const columns: WorkloadBenchmarkColumn[] = data.columns;
	const orgId = data.orgId;
	let editOriginal: Record<string, string> = {};
	let committing = false;

	const cloneValues = (incoming: WorkloadBenchmarkValues): WorkloadBenchmarkValues => ({
		...incoming,
	});

	let values = $state<WorkloadBenchmarkValues>(cloneValues(data.values));
	let saving = $state(false);
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let lastSavedToken = $state<string | null>(null);
	type Banner = { text: string; tone: 'success' | 'error' } | null;
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let notification = $state<Banner>(null);
	let activeColumn = $state<number | null>(null);
	let selectAllOnNextFocus = false;
	let editDraft: Record<string, string> = {};

	const translate = (key: string, vars?: Record<string, string | number>) => get(t)(key, vars);

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const updateCellValue = (
		column: WorkloadBenchmarkColumn,
		value: string,
		_target?: HTMLElement,
	) => {
		const sanitized = sanitizeInput(value);

		if (!isValidNumericInput(sanitized)) {
			if (_target) {
				_target.textContent = values[column.key] ?? '';
			}
			return;
		}

		values = {
			...values,
			[column.key]: sanitized,
		};
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

	const focusCell = (colIndex: number, opts: { select?: boolean } = {}) => {
		if (typeof document === 'undefined') return;
		const cell = document.querySelector<HTMLElement>(`[data-cell="${colIndex}"]`);
		if (cell) {
			selectAllOnNextFocus = opts.select ?? true;
			cell.focus();
		}
	};

	const parseClipboard = (text: string) => {
		if (!text.includes('\t') && !text.includes('\n')) {
			return null;
		}

		const lines = text
			.replace(/\r/g, '')
			.split('\n')
			.filter((line, index, arr) => !(index === arr.length - 1 && line.trim() === ''));

		if (!lines.length) return null;

		return lines.map((line) => line.split('\t'));
	};

	const handleFocus = (event: FocusEvent, colIndex: number) => {
		activeColumn = colIndex;
		if (selectAllOnNextFocus) {
			selectAllOnNextFocus = false;
			selectAll(event.currentTarget as HTMLElement);
		}
	};

	const selectAll = (node: HTMLElement) => {
		const selection = window.getSelection();
		if (!selection) return;
		const range = document.createRange();
		range.selectNodeContents(node);
		selection.removeAllRanges();
		selection.addRange(range);
	};

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const currentCellLabel = () => {
		if (activeColumn === null) return '';
		const column = columns[activeColumn];
		return column ? column.label : '';
	};

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const restoreCaretToEnd = (node: HTMLElement) => {
		if (typeof window === 'undefined') return;
		requestAnimationFrame(() => {
			const selection = window.getSelection();
			if (!selection) return;
			const range = document.createRange();
			range.selectNodeContents(node);
			range.collapse(false);
			selection.removeAllRanges();
			selection.addRange(range);
		});
	};
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

	const handleSubmit = async (event: SubmitEvent) => {
		event.preventDefault();
		await saveChanges();
	};
</script>

<form
	class="mx-auto flex max-w-screen-2xl flex-col gap-4 px-4 py-6 text-slate-900"
	onsubmit={handleSubmit}
>
	<!-- Header -->
	<div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
		<div>
			<h1 class="text-xl font-semibold">{$t('gps.workloadBenchmark.title')}</h1>
			<p class="text-slate-600">{$t('gps.workloadBenchmark.description')}</p>
		</div>
		<div class="flex items-center gap-2">
			<button
				type="submit"
				class="rounded-lg bg-blue-600 px-3 py-2 text-white disabled:bg-slate-400"
				disabled={saving}
			>
				<span class="whitespace-nowrap">
					{saving ? $t('gps.workloadBenchmark.saving') : $t('gps.workloadBenchmark.save')}
				</span>
			</button>
		</div>
	</div>

	<!-- Banner -->
	<!-- {#if notification}
		<div
			class={`rounded-lg border px-3 py-2 font-medium ${
				notification.tone === 'error'
					? 'border-red-300 bg-red-50 text-red-700'
					: 'border-emerald-300 bg-emerald-50 text-emerald-700'
			}`}
		>
			{notification.text}
		</div>
	{/if} -->

	<!-- Hints -->
	<ul class="flex flex-wrap gap-4 text-sm text-slate-600">
		<li>{$t('gps.workloadBenchmark.tipMove')}</li>
		<li>{$t('gps.workloadBenchmark.tipPaste')}</li>
		<li>{$t('gps.workloadBenchmark.tipShared')}</li>
	</ul>

	<!-- Table -->
	<div
		class="max-h-[calc(100vh-320px)] overflow-auto rounded-xl border border-slate-300 shadow-inner"
	>
		<table class="w-full min-w-[720px] border-collapse text-sm [font-variant-numeric:tabular-nums]">
			<thead class="sticky top-0 z-10 bg-slate-50">
				<tr>
					{#each columns as column (column.key)}
						<th class="border border-slate-200 text-left align-bottom">
							<div class="px-2 py-2 font-semibold text-slate-800">{column.label}</div>
							<!-- {#if column.metricDefinitionId}
								<div class="px-2 pb-2 font-mono text-[0.7rem] text-slate-500">
									{column.metricDefinitionId}
								</div>
							{/if} -->
						</th>
					{/each}
				</tr>
			</thead>

			<tbody>
				<tr>
					{#each columns as column, colIndex (column.key)}
						<td
							class={`min-w-[130px] border border-slate-200 p-0 align-top ${
								activeColumn === colIndex ? 'outline-2 -outline-offset-2 outline-blue-600' : ''
							}`}
						>
							<div
								class="min-h-[38px] cursor-text px-2 py-2 pb-4 text-right outline-none focus:bg-indigo-50"
								role="textbox"
								aria-label={column.label}
								data-cell={`${colIndex}`}
								contenteditable="plaintext-only"
								tabindex="0"
								spellcheck={false}
								onfocus={(event) => {
									handleFocus(event, colIndex);
									const current = (event.currentTarget as HTMLElement).textContent ?? '';
									// capture both original and draft; do NOT write to values here
									editOriginal[column.key] = current;
									editDraft[column.key] = current;
								}}
								onblur={async () => {
									if (committing) return;
									const next = sanitizeInput(editDraft[column.key] ?? '');
									const prev = sanitizeInput(editOriginal[column.key] ?? '');
									if (next !== prev) {
										values = { ...values, [column.key]: next }; // commit once
										committing = true;
										await saveChanges();
										committing = false;
										editOriginal[column.key] = next;
									}
									activeColumn = null;
								}}
								onpaste={async (event) => {
									event.preventDefault();
									const text = event.clipboardData?.getData('text/plain');
									const matrix = text && parseClipboard(text);
									if (!matrix) return;

									const flat = matrix.flat();
									if (!flat.length) return;

									let changed = false;
									flat.forEach((v, i) => {
										const idx = colIndex + i;
										if (idx >= columns.length) return;
										const key = columns[idx].key;
										const next = sanitizeInput(v);
										const prev = sanitizeInput(
											(idx === colIndex ? editDraft[key] : values[key]) ?? '',
										);
										if (next !== prev) {
											if (idx === colIndex) {
												// update draft for the active cell
												editDraft[key] = next;
											} else {
												// update committed values for other cells in the paste range
												values = { ...values, [key]: next };
											}
											changed = true;
										}
									});

									if (changed) {
										// commit active cell draft too
										if (
											sanitizeInput(editDraft[column.key] ?? '') !==
											sanitizeInput(editOriginal[column.key] ?? '')
										) {
											values = {
												...values,
												[column.key]: sanitizeInput(editDraft[column.key] ?? ''),
											};
											editOriginal[column.key] = sanitizeInput(editDraft[column.key] ?? '');
										}
										committing = true;
										await saveChanges();
										committing = false;
									}

									// move caret to last pasted cell
									const lastIndex = Math.min(colIndex + flat.length - 1, columns.length - 1);
									focusCell(lastIndex, { select: true });
								}}
								onkeydown={async (event) => {
									const navKeys = ['Enter', 'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'];
									// eslint-disable-next-line @typescript-eslint/no-explicit-any
									if (!navKeys.includes(event.key) || (event as any).isComposing) return;

									event.preventDefault();

									const next = sanitizeInput(editDraft[column.key] ?? '');
									const prev = sanitizeInput(editOriginal[column.key] ?? '');

									if (next !== prev) {
										values = { ...values, [column.key]: next }; // commit once
										committing = true;
										await saveChanges();
										committing = false;
										editOriginal[column.key] = next;
									}

									const last = columns.length - 1;
									let nextIdx = colIndex;
									if (event.key === 'Enter' || event.key === 'ArrowRight')
										nextIdx = Math.min(colIndex + 1, last);
									if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
										nextIdx = Math.max(colIndex - 1, 0);
									if (event.key === 'ArrowDown') nextIdx = Math.min(colIndex + 1, last);

									focusCell(nextIdx, { select: true });
								}}
								oninput={(event) => {
									// only update the draft; DO NOT update `values` while typing
									editDraft[column.key] = (event.currentTarget as HTMLElement).textContent ?? '';
								}}
							>
								{values[column.key] ?? ''}
							</div>
						</td>
					{/each}
				</tr>
			</tbody>
		</table>
	</div>
</form>
