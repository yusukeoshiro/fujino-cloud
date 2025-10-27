<script lang="ts">
	import { tick } from 'svelte';
	import { DateTime } from 'luxon';
	import type { PageData } from './$types';
	import type {
		TrainingBudgetConfig,
		TrainingKeyEvent,
		WeeklyTrainingBudget,
	} from '$lib/services/training-budget.service';
	import { alignToWeekStart, getCalendarYearRange } from '$lib/utils/calendar.util';

	let { data }: { data: PageData } = $props();

	const orgId = data.orgId;
	const todayIso = data.today;

	const config = $state<TrainingBudgetConfig>({ ...data.config });
	let currentYear = $state<number>(data.year);
	let budgetsMap = $state<Record<string, string>>(mapBudgets(data.budgets));
	let events = $state<TrainingKeyEvent[]>([...data.events]);
	let deletedEventIds = $state<Set<string>>(new Set());
	let saving = $state(false);
	let autoSaving = $state(false);
	let loadingYear = $state(false);
	let notification = $state<{ text: string; tone: 'success' | 'error' } | null>(null);

	const weekDayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
	const rotatedWeekdayLabels = $derived(
		weekDayLabels.map(
			(_, index) => weekDayLabels[(index + config.weekStartsOn) % weekDayLabels.length],
		),
	);

	const eventsByDate = $derived(groupEvents(events));
	const weeks = $derived(
		buildWeeks(currentYear, config.weekStartsOn, config.startMonth, eventsByDate),
	);

	let selectedBudgetIndex = $state<number | null>(null);
	let editingBudgetIndex = $state<number | null>(null);
	let editingDraft = $state('');
	let editingOriginalValue = '';
	let editingSelectMode: 'all' | 'end' = 'all';
	let budgetEditorEl = $state<HTMLElement | null>(null);

	let addEventFor = $state<string | null>(null);
	let addEventDraft = $state('');
	let addEventInputEl = $state<HTMLInputElement | null>(null);

	let saveQueue: Promise<void> = Promise.resolve();

	const numericPattern = /^-?\d*(?:\.\d*)?$/;

	const monthOptions = Array.from({ length: 12 }).map((_, index) => ({
		value: index + 1,
		label: `${index + 1}月`,
	}));

	const weekStartOptions = [
		{ value: 0, label: 'Mon' },
		{ value: 1, label: 'Tue' },
		{ value: 2, label: 'Wed' },
		{ value: 3, label: 'Thu' },
		{ value: 4, label: 'Fri' },
		{ value: 5, label: 'Sat' },
		{ value: 6, label: 'Sun' },
	];

	$effect(() => {
		if (!weeks.length) {
			selectedBudgetIndex = null;
			editingBudgetIndex = null;
			editingDraft = '';
			return;
		}

		if (selectedBudgetIndex !== null && selectedBudgetIndex >= weeks.length) {
			selectedBudgetIndex = null;
		}

		if (editingBudgetIndex !== null && !weeks[editingBudgetIndex]) {
			editingBudgetIndex = null;
			editingDraft = '';
			editingOriginalValue = '';
		}
	});

	function groupEvents(list: TrainingKeyEvent[]) {
		return list.reduce<Record<string, TrainingKeyEvent[]>>((acc, event) => {
			if (!acc[event.eventDate]) acc[event.eventDate] = [];
			acc[event.eventDate].push(event);
			return acc;
		}, {});
	}

	function mapBudgets(list: WeeklyTrainingBudget[] = []) {
		return Object.fromEntries(list.map((item) => [item.allocatedOn, item.budget.toString()]));
	}

	function buildWeeks(
		year: number,
		weekStartsOn: number,
		startMonth: number,
		eventMap: Record<string, TrainingKeyEvent[]>,
	) {
		const { start, end } = getCalendarYearRange(year, startMonth, weekStartsOn);
		const startMonthIndex = start.year * 12 + (start.month - 1);
		let cursor = alignToWeekStart(start, weekStartsOn);
		const result: Array<{
			index: number;
			startIso: string;
			days: Array<{
				iso: string;
				label: string;
				isCurrentYear: boolean;
				isToday: boolean;
				events: TrainingKeyEvent[];
				isAltMonth: boolean;
			}>;
		}> = [];
		let index = 0;
		while (cursor < end) {
			const startIso = cursor.toISODate()!;
			const days = Array.from({ length: 7 }, (_, dayIndex) => {
				const date = cursor.plus({ days: dayIndex });
				const iso = date.toISODate()!;
				const monthIndex = date.year * 12 + (date.month - 1);
				const isAltMonth = (((monthIndex - startMonthIndex) % 2) + 2) % 2 === 1;
				return {
					iso,
					label: date.toFormat('MM/dd'),
					isCurrentYear: date >= start && date < end,
					isToday: iso === todayIso,
					events: eventMap[iso] ?? [],
					isAltMonth,
				};
			});
			result.push({ index: index + 1, startIso, days });
			index += 1;
			cursor = cursor.plus({ weeks: 1 });
		}
		return result;
	}

	const sanitizeInput = (value: string) =>
		value
			.replace(/\u00a0/g, ' ')
			.replace(/\r/g, '')
			.replace(/\n/g, '')
			.replace(/\t/g, ' ')
			.trim();

	function updateBudgetValue(weekStart: string, rawValue: string) {
		const sanitized = sanitizeInput(rawValue);
		if (sanitized && !numericPattern.test(sanitized)) {
			return;
		}
		budgetsMap = {
			...budgetsMap,
			[weekStart]: sanitized,
		};
	}

	function parseClipboard(text: string) {
		const rows = text.replace(/\r/g, '').split('\n');
		if (rows.length && rows[rows.length - 1].trim() === '') {
			rows.pop();
		}
		return rows.flatMap((row) => row.split('\t')).map((value) => sanitizeInput(value));
	}

	function handleBudgetCellClick(index: number) {
		if (editingBudgetIndex !== null) {
			void commitEditing('stay');
		}
		selectBudgetCell(index);
	}

	function selectBudgetCell(index: number | null) {
		if (index === null || !weeks[index]) {
			selectedBudgetIndex = null;
			return;
		}
		selectedBudgetIndex = index;
		void focusBudgetButton(index);
	}

	async function startEditing(
		index: number,
		options: { initialValue?: string; selectMode?: 'all' | 'end' } = {},
	) {
		if (!weeks[index]) return;
		const week = weeks[index];
		selectedBudgetIndex = index;
		editingSelectMode = options.selectMode ?? 'all';
		const initial =
			options.initialValue !== undefined
				? sanitizeInput(options.initialValue)
				: (budgetsMap[week.startIso] ?? '');
		if (initial && !numericPattern.test(initial)) {
			return;
		}
		editingBudgetIndex = index;
		editingOriginalValue = budgetsMap[week.startIso] ?? '';
		editingDraft = initial;
		await tick();
		if (budgetEditorEl) {
			budgetEditorEl.textContent = editingDraft;
			budgetEditorEl.focus();
			if (editingSelectMode === 'all') {
				selectAll(budgetEditorEl);
			} else {
				moveCaretToEnd(budgetEditorEl);
			}
		}
	}

	async function commitEditing(direction: 'stay' | 'down' | 'up' = 'stay') {
		if (editingBudgetIndex === null) return;
		const index = editingBudgetIndex;
		const week = weeks[index];
		const value = sanitizeInput(editingDraft);
		if (value && !numericPattern.test(value)) {
			return;
		}
		updateBudgetValue(week.startIso, value);
		editingBudgetIndex = null;
		editingDraft = '';
		editingOriginalValue = '';
		budgetEditorEl = null;
		queuePersist();
		let nextIndex = index;
		if (direction === 'down') {
			nextIndex = Math.min(index + 1, weeks.length - 1);
		} else if (direction === 'up') {
			nextIndex = Math.max(index - 1, 0);
		}
		selectedBudgetIndex = weeks.length ? nextIndex : null;
		if (selectedBudgetIndex !== null) {
			await focusBudgetButton(selectedBudgetIndex);
		}
	}

	function cancelEditing() {
		if (editingBudgetIndex === null) return;
		const index = editingBudgetIndex;
		editingBudgetIndex = null;
		editingDraft = '';
		editingOriginalValue = '';
		budgetEditorEl = null;
		selectedBudgetIndex = index;
		void focusBudgetButton(index);
	}

	function handleSelectionKeydown(event: KeyboardEvent, index: number) {
		const { key } = event;
		const lastIndex = weeks.length - 1;
		switch (key) {
			case 'ArrowDown':
				event.preventDefault();
				selectBudgetCell(Math.min(index + 1, lastIndex));
				break;
			case 'ArrowUp':
				event.preventDefault();
				selectBudgetCell(Math.max(index - 1, 0));
				break;
			case 'Enter':
				event.preventDefault();
				void startEditing(index, { selectMode: 'all' });
				break;
			case 'F2':
				event.preventDefault();
				void startEditing(index, { selectMode: 'end' });
				break;
			case 'Delete':
			case 'Backspace':
				event.preventDefault();
				updateBudgetValue(weeks[index].startIso, '');
				queuePersist();
				break;
			case 'Tab':
				event.preventDefault();
				selectBudgetCell(Math.min(index + (event.shiftKey ? -1 : 1), lastIndex));
				break;
			default:
				if (key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
					const initial = sanitizeInput(key);
					if (initial === '' && key.trim() !== '') return;
					if (initial && !numericPattern.test(initial)) return;
					event.preventDefault();
					void startEditing(index, { initialValue: initial, selectMode: 'end' });
				}
		}
	}

	function handleSelectionPaste(event: ClipboardEvent, index: number) {
		const text = event.clipboardData?.getData('text/plain');
		if (!text) return;
		const values = parseClipboard(text);
		if (!values.length) return;
		event.preventDefault();
		values.forEach((value, offset) => {
			const targetWeek = weeks[index + offset];
			if (!targetWeek) return;
			updateBudgetValue(targetWeek.startIso, value);
		});
		queuePersist();
		selectBudgetCell(Math.min(index + values.length - 1, weeks.length - 1));
	}

	function handleEditorInput(event: Event) {
		if (editingBudgetIndex === null) return;
		const node = event.currentTarget as HTMLElement;
		const text = node.textContent ?? '';
		const sanitized = sanitizeInput(text);
		if (sanitized && !numericPattern.test(sanitized)) {
			node.textContent = editingDraft;
			moveCaretToEnd(node);
			return;
		}
		editingDraft = sanitized;
	}

	function handleEditorKeydown(event: KeyboardEvent, index: number) {
		switch (event.key) {
			case 'Enter':
				event.preventDefault();
				void commitEditing(event.shiftKey ? 'up' : 'down');
				break;
			case 'Escape':
				event.preventDefault();
				cancelEditing();
				break;
			case 'ArrowDown':
				event.preventDefault();
				void commitEditing('down');
				break;
			case 'ArrowUp':
				event.preventDefault();
				void commitEditing('up');
				break;
			case 'Tab':
				event.preventDefault();
				void commitEditing(event.shiftKey ? 'up' : 'down');
				break;
		}
	}

	function handleEditorPaste(event: ClipboardEvent, index: number) {
		const text = event.clipboardData?.getData('text/plain');
		if (!text) return;
		const values = parseClipboard(text);
		if (!values.length) return;
		event.preventDefault();
		values.forEach((value, offset) => {
			const targetWeek = weeks[index + offset];
			if (!targetWeek) return;
			if (offset === 0) {
				editingDraft = value;
				if (budgetEditorEl) {
					budgetEditorEl.textContent = value;
					moveCaretToEnd(budgetEditorEl);
				}
			} else {
				updateBudgetValue(targetWeek.startIso, value);
			}
		});
		queuePersist();
		if (values.length > 1) {
			void commitEditing('stay');
			selectBudgetCell(Math.min(index + values.length - 1, weeks.length - 1));
		}
	}

	function openAddEvent(date: string) {
		addEventFor = date;
		addEventDraft = '';
		void tick().then(() => addEventInputEl?.focus());
	}

	function cancelAddEvent() {
		addEventFor = null;
		addEventDraft = '';
	}

	function submitAddEvent(date: string) {
		const name = addEventDraft.trim();
		if (!name) return;
		events = [...events, { id: `temp-${randomId()}`, orgId, eventDate: date, eventName: name }];
		addEventFor = null;
		addEventDraft = '';
		queuePersist();
	}

	function handleAddEventKeydown(event: KeyboardEvent, date: string) {
		switch (event.key) {
			case 'Enter':
				event.preventDefault();
				submitAddEvent(date);
				break;
			case 'Escape':
				event.preventDefault();
				cancelAddEvent();
				break;
		}
	}

	function removeEvent(eventId: string, eventDate: string) {
		const event = events.find((item) => item.id === eventId);
		if (!event) return;
		events = events.filter((item) => item.id !== eventId);
		if (!event.id.startsWith('temp-')) {
			const next = new Set(deletedEventIds);
			next.add(event.id);
			deletedEventIds = next;
		}
		addEventFor = null;
		queuePersist();
	}

	function queuePersist(options: { showToast?: boolean } = {}) {
		saveQueue = saveQueue
			.then(() => persistChanges(options))
			.catch((error) => {
				console.error('Failed to save training budget', error);
			});
		return saveQueue;
	}

	async function persistChanges({ showToast = false }: { showToast?: boolean } = {}) {
		if (!weeks.length) return;

		if (showToast) {
			saving = true;
			notification = null;
		} else {
			autoSaving = true;
		}

		try {
			const payload = {
				orgId,
				year: currentYear,
				config: {
					startMonth: config.startMonth,
					weekStartsOn: config.weekStartsOn,
				},
				budgets: weeks.map((week) => ({
					allocatedOn: week.startIso,
					value: budgetsMap[week.startIso] ?? '',
				})),
				events: events.map((event) => ({
					id: event.id.startsWith('temp-') ? undefined : event.id,
					eventDate: event.eventDate,
					eventName: event.eventName,
				})),
				deletedEventIds: Array.from(deletedEventIds),
			};

			const response = await fetch('/api/training-budget', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				throw new Error('Failed to save training budget');
			}

			const data = await response.json();
			config.startMonth = data.config.startMonth;
			config.weekStartsOn = data.config.weekStartsOn;
			budgetsMap = mapBudgets(data.budgets);
			events = data.events;
			deletedEventIds = new Set();

			if (showToast) {
				notification = { text: 'トレーニングバジェットを保存しました。', tone: 'success' };
			}
		} catch (error) {
			console.error(error);
			notification = { text: '保存に失敗しました。', tone: 'error' };
		} finally {
			if (showToast) {
				saving = false;
			} else {
				autoSaving = false;
			}
		}
	}

	async function changeYear(offset: number) {
		const nextYear = currentYear + offset;
		await loadYear(nextYear);
	}

	async function loadYear(year: number) {
		try {
			loadingYear = true;
			const response = await fetch(`/api/training-budget?orgId=${orgId}&year=${year}`, {
				method: 'GET',
			});
			if (!response.ok) {
				throw new Error('Failed to load year data');
			}
			const payload = await response.json();
			currentYear = year;
			config.startMonth = payload.config.startMonth;
			config.weekStartsOn = payload.config.weekStartsOn;
			budgetsMap = mapBudgets(payload.budgets);
			events = payload.events;
			deletedEventIds = new Set();
			editingBudgetIndex = null;
			editingDraft = '';
			editingOriginalValue = '';
			addEventFor = null;
			const { start } = getCalendarYearRange(year, config.startMonth, config.weekStartsOn);
			notification = null;
			await tick();
			selectedBudgetIndex = null;
		} catch (error) {
			console.error(error);
			notification = { text: '年度データの取得に失敗しました。', tone: 'error' };
		} finally {
			loadingYear = false;
		}
	}

	function focusBudgetButton(index: number | null) {
		if (index === null) return Promise.resolve();
		return tick().then(() => {
			const button = document.querySelector<HTMLElement>(`[data-budget-index="${index}"]`);
			button?.focus();
		});
	}

	function selectAll(node: HTMLElement) {
		const selection = window.getSelection();
		if (!selection) return;
		const range = document.createRange();
		range.selectNodeContents(node);
		selection.removeAllRanges();
		selection.addRange(range);
	}

	function moveCaretToEnd(node: HTMLElement) {
		const selection = window.getSelection();
		if (!selection) return;
		const range = document.createRange();
		range.selectNodeContents(node);
		range.collapse(false);
		selection.removeAllRanges();
		selection.addRange(range);
	}

	function randomId() {
		if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
			return crypto.randomUUID();
		}
		return Math.random().toString(16).slice(2);
	}
</script>

<section class="budget-page">
	<header class="page-header">
		<div>
			<h1>トレーニングバジェット管理</h1>
			<p>年間の週次バジェットと重要イベントを一元管理します。</p>
		</div>
		<div class="primary-actions">
			<button
				type="button"
				class="ghost"
				onclick={() => void changeYear(-1)}
				disabled={loadingYear}
			>
				← 前年度
			</button>
			<span class="year-display">{currentYear}年度</span>
			<button type="button" class="ghost" onclick={() => void changeYear(1)} disabled={loadingYear}>
				次年度 →
			</button>
			<button
				type="button"
				class="primary"
				onclick={() => void queuePersist({ showToast: true })}
				disabled={saving || autoSaving}
			>
				{saving ? '保存中...' : autoSaving ? '自動保存中...' : '保存する'}
			</button>
		</div>
	</header>

	<div class="config-panel">
		<div>
			<label for="start-month">年度開始月</label>
			<select id="start-month" bind:value={config.startMonth} onchange={() => queuePersist()}>
				{#each monthOptions as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>
		<div>
			<label for="week-start">週の開始曜日</label>
			<select id="week-start" bind:value={config.weekStartsOn} onchange={() => queuePersist()}>
				{#each weekStartOptions as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>
	</div>

	{#if notification}
		<div class={`banner ${notification.tone}`}>
			{notification.text}
		</div>
	{/if}

	<div class="calendar-wrapper">
		<table class="calendar-table">
			<thead>
				<tr>
					<th class="week-label">Week</th>
					{#each rotatedWeekdayLabels as label}
						<th>{label}</th>
					{/each}
					<th class="budget-column">予算</th>
				</tr>
			</thead>
			<tbody>
				{#each weeks as week, index}
					<tr>
						<th class="week-label">W{week.index}</th>
						{#each week.days as day}
							<td
								class="day-cell"
								class:today={day.isToday}
								class:outside={!day.isCurrentYear}
								class:month-alt={day.isAltMonth}
							>
								<div class="day-wrapper">
									<div class="day-header">
										<span class="day-label">{day.label}</span>
										<button
											type="button"
											class="add-event-button"
											onclick={(event) => {
												event.stopPropagation();
												openAddEvent(day.iso);
											}}
										>
											＋
										</button>
									</div>

									{#if addEventFor === day.iso}
										<div class="event-popover" role="dialog" tabindex="-1">
											<input
												type="text"
												placeholder="イベント名"
												bind:value={addEventDraft}
												bind:this={addEventInputEl}
												onkeydown={(event) =>
													handleAddEventKeydown(event as KeyboardEvent, day.iso)}
											/>
											<div class="popover-actions">
												<button
													type="button"
													class="primary"
													onclick={() => submitAddEvent(day.iso)}
												>
													追加
												</button>
												<button type="button" class="ghost" onclick={cancelAddEvent}>
													キャンセル
												</button>
											</div>
										</div>
									{/if}

									<div class="day-body">
										{#if day.events.length}
											<ul class="events-list">
												{#each day.events.slice(0, 3) as event}
													<li class="event-chip">
														<button
															type="button"
															class="event-chip-main"
															onclick={() => openAddEvent(day.iso)}
														>
															{event.eventName}
														</button>
														<button
															type="button"
															class="event-chip-delete"
															onclick={(eventClick) => {
																eventClick.stopPropagation();
																removeEvent(event.id, day.iso);
															}}
														>
															✕
														</button>
													</li>
												{/each}
												{#if day.events.length > 3}
													<li class="event-chip more">
														<span>+{day.events.length - 3}</span>
													</li>
												{/if}
											</ul>
										{/if}
									</div>
								</div>
							</td>
						{/each}
						<td class="budget-cell">
							{#if editingBudgetIndex === index}
								<div
									class="budget-editor editing"
									contenteditable="true"
									role="textbox"
									tabindex="0"
									spellcheck={false}
									data-budget-index={index}
									bind:this={budgetEditorEl}
									oninput={(event) => handleEditorInput(event)}
									onkeydown={(event) => handleEditorKeydown(event as KeyboardEvent, index)}
									onpaste={(event) => handleEditorPaste(event as ClipboardEvent, index)}
									onblur={() => void commitEditing('stay')}
								></div>
							{:else}
								<button
									type="button"
									class={`budget-display ${selectedBudgetIndex === index ? 'selected' : ''}`}
									data-budget-index={index}
									tabindex={selectedBudgetIndex === index ? 0 : -1}
									onclick={() => handleBudgetCellClick(index)}
									ondblclick={() => void startEditing(index, { selectMode: 'all' })}
									onkeydown={(event) => handleSelectionKeydown(event as KeyboardEvent, index)}
									onpaste={(event) => handleSelectionPaste(event as ClipboardEvent, index)}
								>
									<span>{budgetsMap[week.startIso] ?? ''}</span>
								</button>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>

<style lang="scss">
	.budget-page {
		font-family:
			'Inter',
			'Roboto',
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Hiragino Sans',
			'Yu Gothic',
			sans-serif;
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

	.primary-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.year-display {
		font-weight: 600;
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

	button.ghost {
		background: transparent;
		border-color: #cbd5f5;
		color: #1e293b;
	}

	.config-panel {
		display: flex;
		gap: 1rem;
	}

	.config-panel select {
		padding: 0.4rem 0.6rem;
		border-radius: 8px;
		border: 1px solid #cbd5f5;
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

	.calendar-wrapper {
		border: 1px solid #cbd5f5;
		border-radius: 12px;
		overflow: auto;
	}

	.calendar-table {
		width: max-content;
		min-width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}

	th,
	td {
		border: 1px solid #e2e8f0;
		padding: 0;
		vertical-align: top;
	}

	.week-label {
		background: #f8fafc;
		white-space: nowrap;
		padding: 0.5rem;
	}

	.day-cell {
		position: relative;
		width: 150px;
		height: 100px;
		background: #fff;
	}

	.day-cell.month-alt {
		background: #f9fafb;
	}

	.day-cell.outside {
		background: #f1f5f9;
		color: #94a3b8;
	}

	.day-cell.month-alt.outside {
		background: #e2e8f0;
	}

	.day-cell.today {
		box-shadow: inset 0 0 0 2px #6366f1;
	}

	.day-wrapper {
		display: flex;
		flex-direction: column;
		height: 100%;
		padding: 0.45rem 0.5rem 0.35rem;
		gap: 0.35rem;
	}

	.day-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.25rem;
	}

	.day-label {
		font-weight: 600;
	}

	.add-event-button {
		background: #1e293b;
		color: #fff;
		border: none;
		padding: 0.1rem 0.45rem;
		border-radius: 999px;
		font-size: 0.75rem;
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.15s ease;
	}

	.day-cell:hover .add-event-button {
		opacity: 1;
		pointer-events: auto;
	}

	.event-popover {
		position: absolute;
		top: 2.2rem;
		right: 0.5rem;
		z-index: 10;
		background: #fff;
		border: 1px solid #cbd5f5;
		border-radius: 8px;
		padding: 0.5rem;
		box-shadow: 0 8px 16px rgba(15, 23, 42, 0.15);
		width: 190px;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.event-popover input {
		padding: 0.35rem 0.45rem;
		border-radius: 6px;
		border: 1px solid #cbd5f5;
	}

	.popover-actions {
		display: flex;
		gap: 0.4rem;
		justify-content: flex-end;
	}

	.day-body {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
	}

	.events-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.event-chip {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.event-chip-main {
		flex: 1;
		text-align: left;
		background: #f1f5f9;
		border: none;
		border-radius: 999px;
		padding: 0.25rem 0.4rem;
		cursor: pointer;
		font-size: 0.75rem;
		transition: background 0.15s ease;
	}

	.event-chip-main:hover {
		background: #e2e8f0;
	}

	.event-chip-delete {
		background: transparent;
		border: none;
		color: #dc2626;
		cursor: pointer;
		padding: 0;
		font-size: 0.75rem;
		opacity: 0;
		transition: opacity 0.15s ease;
	}

	.event-chip:hover .event-chip-delete {
		opacity: 1;
	}

	.event-chip.more {
		justify-content: center;
		color: #1e293b;
	}

	.event-chip.more span {
		display: inline-block;
		background: #f1f5f9;
		border-radius: 999px;
		padding: 0.2rem 0.5rem;
	}

	.budget-cell {
		min-width: 130px;
	}

	.budget-display {
		width: 100%;
		min-height: 38px;
		padding: 0.4rem 0.5rem;
		border-radius: 6px;
		background: transparent;
		border: none;
		text-align: right;
		cursor: pointer;
	}

	.budget-display:hover {
		background: #f1f5f9;
	}

	.budget-display.selected,
	.budget-display:focus-visible {
		outline: 2px solid #2563eb;
		outline-offset: -2px;
	}

	.budget-editor {
		min-height: 38px;
		padding: 0.4rem 0.5rem;
		border-radius: 6px;
		background: #fff;
		text-align: right;
		outline: none;
	}

	.budget-editor.editing {
		box-shadow: 0 0 0 2px #c7d2fe;
	}

	@media (max-width: 960px) {
		.page-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.primary-actions {
			flex-wrap: wrap;
		}

		.config-panel {
			flex-direction: column;
		}
	}
</style>
