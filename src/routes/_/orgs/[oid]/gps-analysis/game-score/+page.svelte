<script lang="ts">
	import type { PageData } from './$types';
	import {
		type GameScoreColumn,
		type GameScoreValues,
		entriesFromValuesMap,
		valuesMapFromEntries
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

	const updateCellValue = (column: GameScoreColumn, value: string) => {
		values = {
			...values,
			[column.key]: sanitizeInput(value)
		};
	};

	const sanitizeInput = (value: string) =>
		value.replace(/\u00a0/g, ' ').replace(/\r/g, '').replace(/\n/g, '').replace(/\t/g, ' ');

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
	const saveChanges = async () => {
		saving = true;
		notification = null;

		try {
			const response = await fetch('/api/game-score', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					orgId,
					values: entriesFromValuesMap(values)
				})
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
				tone: 'success'
			};
		} catch (error) {
			console.error('Failed to save game score', error);
			notification = {
				text: '保存に失敗しました。接続状況を確認してください。',
				tone: 'error'
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

<form class="game-score-page" onsubmit={handleSubmit}>
	<div class="page-header">
		<div>
			<h1>ゲームスコアの管理</h1>
			<p>
				チーム全体のゲームスコアをExcelライクに調整できます。コピー＆ペーストや矢印キーでの移動に対応し、数値をまとめて更新できます。
			</p>
		</div>
		<div class="header-actions">
			<button type="submit" class="primary" disabled={saving}>
				{saving ? '保存中...' : '保存する'}
			</button>
		</div>
	</div>

	{#if notification}
		<div class={`banner ${notification.tone === 'error' ? 'error' : 'success'}`}>
			{notification.text}
		</div>
	{/if}

	<ul class="hints">
		<li>Enter / 矢印キーでセル移動</li>
		<li>Ctrl / Command + V で複数セル貼り付け</li>
		<li>すべての値がチーム共通で保存されます</li>
	</ul>

	<div class="table-wrapper">
		<table>
			<thead>
				<tr>
					{#each columns as column}
						<th scope="col">
							<div>{column.label}</div>
							{#if column.metricDefinitionId}
								<div class="column-id">{column.metricDefinitionId}</div>
							{/if}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				<tr>
					{#each columns as column, colIndex}
						<td class:selected={activeColumn === colIndex}>
							<div
								class="cell-editor numeric"
								role="textbox"
								aria-label={column.label}
								data-cell={`${colIndex}`}
								data-placeholder="0"
								contenteditable="true"
								tabindex="0"
								spellcheck={false}
								onfocus={(event) => handleFocus(event, colIndex)}
								oninput={(event) =>
									updateCellValue(column, (event.currentTarget as HTMLElement).textContent ?? '')
								}
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

	<div class="status-bar">
		<div>
			<strong>選択セル:</strong> {currentCellLabel() || 'なし'}
		</div>
		<div>
			<strong>最終保存:</strong>
			{lastSavedToken ? new Date(lastSavedToken).toLocaleString() : 'まだ保存されていません'}
		</div>
	</div>
</form>

<style>
	.game-score-page {
		font-family: 'Inter', 'Roboto', system-ui, -apple-system, BlinkMacSystemFont, 'Hiragino Sans',
			'Yu Gothic', sans-serif;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.5rem;
		color: #0f172a;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	h1 {
		margin: 0 0 0.25rem;
		font-size: 1.4rem;
	}

	p {
		margin: 0;
		color: #475569;
	}

	.header-actions {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

	button {
		border-radius: 8px;
		padding: 0.55rem 1.2rem;
		font-size: 0.95rem;
		border: 1px solid transparent;
		cursor: pointer;
	}

	button.primary {
		background: #2563eb;
		color: #fff;
		border-color: #1d4ed8;
	}

	button.primary:disabled {
		background: #94a3b8;
		border-color: #94a3b8;
		cursor: not-allowed;
	}

	.banner {
		padding: 0.75rem 1rem;
		border-radius: 8px;
		font-weight: 500;
	}

	.banner.success {
		background: #ecfdf5;
		color: #047857;
		border: 1px solid #6ee7b7;
	}

	.banner.error {
		background: #fef2f2;
		color: #b91c1c;
		border: 1px solid #fecaca;
	}

	.hints {
		display: flex;
		gap: 1.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: 0.9rem;
		color: #475569;
	}

	.table-wrapper {
		border: 1px solid #cbd5f5;
		border-radius: 12px;
		overflow: auto;
		box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.4);
		max-height: calc(100vh - 320px);
	}

	table {
		border-collapse: collapse;
		width: max-content;
		min-width: 100%;
		font-size: 0.9rem;
		font-variant-numeric: tabular-nums;
	}

	th,
	td {
		border: 1px solid #e2e8f0;
		padding: 0;
		background: #fff;
	}

	thead th {
		position: sticky;
		top: 0;
		background: #f8fafc;
		font-weight: 600;
		text-align: left;
		padding: 0.45rem;
	}

	.column-id {
		font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
		font-size: 0.7rem;
		color: #64748b;
		margin-top: 0.15rem;
	}

	td {
		min-width: 130px;
	}

	td.selected {
		outline: 2px solid #2563eb;
		outline-offset: -2px;
	}

	.cell-editor {
		padding: 0.4rem 0.5rem;
		min-height: 38px;
		outline: none;
		cursor: text;
	}

	.cell-editor.numeric {
		text-align: right;
	}

	.cell-editor:focus {
		background: #eef2ff;
	}

	.cell-editor:empty::before {
		content: attr(data-placeholder);
		color: #cbd5f5;
		pointer-events: none;
	}

	.status-bar {
		display: flex;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		background: #f8fafc;
		color: #334155;
		font-size: 0.9rem;
	}

	@media (max-width: 960px) {
		.page-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.header-actions {
			width: 100%;
			justify-content: flex-start;
		}

		.table-wrapper {
			max-height: none;
		}

		.status-bar {
			flex-direction: column;
			gap: 0.5rem;
		}
	}
</style>
