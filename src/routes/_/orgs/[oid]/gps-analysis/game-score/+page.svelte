<script lang="ts">
	import type { PageData } from './$types';
	import {
		type GameScoreColumn,
		type GameScoreValues,
		entriesFromValuesMap,
		valuesMapFromEntries,
	} from './columns';

	let { data }: { data: PageData } = $props();

	const columns: GameScoreColumn[] = data.columns;
	const orgId = data.orgId;

	const cloneValues = (incoming: GameScoreValues): GameScoreValues => ({ ...incoming });

	let values = $state<GameScoreValues>(cloneValues(data.values));
	let saving = $state(false);
	let lastSavedToken = $state<string | null>(null);
	type Banner = { text: string; tone: 'success' | 'error' } | null;
	let notification = $state<Banner>(null);
	let activeColumn = $state<number | null>(null);
	let selectAllOnNextFocus = false;

	const updateCellValue = (column: GameScoreColumn, value: string, target?: HTMLElement) => {
		const sanitized = sanitizeInput(value);

		if (!isValidNumericInput(sanitized)) {
			if (target) {
				target.textContent = values[column.key] ?? '';
				restoreCaretToEnd(target);
			}
			return;
		}

		values = {
			...values,
			[column.key]: sanitized,
		};

		if (target) {
			restoreCaretToEnd(target);
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

	const focusCell = (colIndex: number, opts: { select?: boolean } = {}) => {
		if (typeof document === 'undefined') return;
		const cell = document.querySelector<HTMLElement>(`[data-cell="${colIndex}"]`);
		if (cell) {
			selectAllOnNextFocus = opts.select ?? true;
			cell.focus();
		}
	};

	const handleKeydown = (event: KeyboardEvent, colIndex: number) => {
		const { key, shiftKey } = event;
		const lastColumnIndex = columns.length - 1;

		const goTo = (targetCol: number) => {
			if (targetCol < 0 || targetCol > lastColumnIndex) return;
			focusCell(targetCol, { select: true });
		};

		switch (key) {
			case 'ArrowRight':
			case 'ArrowDown':
				event.preventDefault();
				goTo(Math.min(colIndex + 1, lastColumnIndex));
				break;
			case 'ArrowLeft':
			case 'ArrowUp':
				event.preventDefault();
				goTo(Math.max(colIndex - 1, 0));
				break;
			case 'Enter':
				event.preventDefault();
				goTo(shiftKey ? Math.max(colIndex - 1, 0) : Math.min(colIndex + 1, lastColumnIndex));
				break;
		}
	};

	const handlePaste = (event: ClipboardEvent, colIndex: number) => {
		const text = event.clipboardData?.getData('text/plain');
		if (!text) return;

		const matrix = parseClipboard(text);
		if (!matrix) return;

		event.preventDefault();
		const flattened = matrix.flat();
		if (!flattened.length) return;

		const updated = { ...values };
		let pointer = colIndex;

		for (const value of flattened) {
			if (pointer >= columns.length) break;
			const column = columns[pointer];
			updated[column.key] = sanitizeInput(value);
			pointer += 1;
		}

		values = updated;
		focusCell(Math.min(pointer - 1, columns.length - 1), { select: true });
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

	const currentCellLabel = () => {
		if (activeColumn === null) return '';
		const column = columns[activeColumn];
		return column ? column.label : '';
	};

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
			const response = await fetch('/api/game-score', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					orgId,
					values: entriesFromValuesMap(values),
				}),
			});

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
				text: payload?.message ?? 'ゲームスコアを保存しました。',
				tone: 'success',
			};
		} catch (error) {
			console.error('Failed to save game score', error);
			notification = {
				text: '保存に失敗しました。接続状況を確認してください。',
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
			<h1 class="text-xl font-semibold">ゲームスコアの管理</h1>
			<p class="text-slate-600">
				チーム全体のゲームスコアをExcelライクに調整できます。コピー＆ペーストや矢印キーでの移動に対応し、数値をまとめて更新できます。
			</p>
		</div>
		<div class="flex items-center gap-2">
			<button
				type="submit"
				class="rounded-lg bg-blue-600 px-3 py-2 text-white disabled:bg-slate-400"
				disabled={saving}
			>
				<span class="whitespace-nowrap">{saving ? '保存中...' : '保存する'}</span>
			</button>
		</div>
	</div>

	<!-- Banner -->
	{#if notification}
		<div
			class={`rounded-lg border px-3 py-2 font-medium ${
				notification.tone === 'error'
					? 'border-red-300 bg-red-50 text-red-700'
					: 'border-emerald-300 bg-emerald-50 text-emerald-700'
			}`}
		>
			{notification.text}
		</div>
	{/if}

	<!-- Hints -->
	<ul class="flex flex-wrap gap-4 text-sm text-slate-600">
		<li>Enter / 矢印キーでセル移動</li>
		<li>Ctrl / Command + V で複数セル貼り付け</li>
		<li>すべての値がチーム共通で保存されます</li>
	</ul>

	<!-- Table -->
	<div
		class="max-h-[calc(100vh-320px)] overflow-auto rounded-xl border border-slate-300 shadow-inner"
	>
		<table class="w-full min-w-[720px] border-collapse text-sm [font-variant-numeric:tabular-nums]">
			<thead class="sticky top-0 z-10 bg-slate-50">
				<tr>
					{#each columns as column}
						<th class="border border-slate-200 text-left align-bottom">
							<div class="px-2 py-2 font-semibold text-slate-800">{column.label}</div>
							{#if column.metricDefinitionId}
								<div class="px-2 pb-2 font-mono text-[0.7rem] text-slate-500">
									{column.metricDefinitionId}
								</div>
							{/if}
						</th>
					{/each}
				</tr>
			</thead>

			<tbody>
				<tr>
					{#each columns as column, colIndex}
						<td
							class={`min-w-[130px] border border-slate-200 p-0 align-top ${
								activeColumn === colIndex
									? 'outline outline-2 -outline-offset-2 outline-blue-600'
									: ''
							}`}
						>
							<div
								class="min-h-[38px] cursor-text px-2 py-2 text-right outline-none focus:bg-indigo-50"
								role="textbox"
								aria-label={column.label}
								data-cell={`${colIndex}`}
								contenteditable="true"
								tabindex="0"
								spellcheck={false}
								onfocus={(event) => handleFocus(event, colIndex)}
								oninput={(event) =>
									updateCellValue(
										column,
										(event.currentTarget as HTMLElement).textContent ?? '',
										event.currentTarget as HTMLElement,
									)}
								onkeydown={(event) => handleKeydown(event as KeyboardEvent, colIndex)}
								onpaste={(event) => handlePaste(event as ClipboardEvent, colIndex)}
							>
								{values[column.key] || ''}
							</div>
						</td>
					{/each}
				</tr>
			</tbody>
		</table>
	</div>

	<!-- Status bar -->
	<div
		class="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between"
	>
		<div>
			<span class="font-semibold">選択セル:</span>
			<span class="ml-1">{currentCellLabel() || 'なし'}</span>
		</div>
		<div>
			<span class="font-semibold">最終保存:</span>
			<span class="ml-1"
				>{lastSavedToken
					? new Date(lastSavedToken).toLocaleString()
					: 'まだ保存されていません'}</span
			>
		</div>
	</div>
</form>
