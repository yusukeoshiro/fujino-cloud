<script lang="ts">
	import { DateTime } from 'luxon';
	import type { PageData } from './$types';
	import type {
		TrainingBudgetConfig,
		TrainingKeyEvent,
		WeeklyTrainingBudget
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
let loadingYear = $state(false);
let notification = $state<{ text: string; tone: 'success' | 'error' } | null>(null);
let selectedDate = $state<string>(todayIso);
let draftEventName = $state('');

	const weekDayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
	const rotatedWeekdayLabels = $derived(
		weekDayLabels.map(
			(_, index) => weekDayLabels[(index + config.weekStartsOn) % weekDayLabels.length]
		)
	);

	const eventsByDate = $derived(groupEvents(events));

	const weeks = $derived(
		buildWeeks(currentYear, config.weekStartsOn, config.startMonth, eventsByDate)
	);

	function groupEvents(list: TrainingKeyEvent[]) {
		return list.reduce<Record<string, TrainingKeyEvent[]>>((acc, event) => {
			if (!acc[event.eventDate]) acc[event.eventDate] = [];
			acc[event.eventDate].push(event);
			return acc;
		}, {});
	}

	function mapBudgets(list: WeeklyTrainingBudget[] = []) {
		return Object.fromEntries(
			list.map((item) => [item.allocatedOn, item.budget.toString()])
		);
	}

	function formatDate(dateIso: string) {
		return DateTime.fromISO(dateIso).toFormat('yyyy/MM/dd (ccc)');
	}

	function buildWeeks(
		year: number,
		weekStartsOn: number,
		startMonth: number,
		eventMap: Record<string, TrainingKeyEvent[]>
	) {
		const { start, end } = getCalendarYearRange(year, startMonth);
		let cursor = alignToWeekStart(start, weekStartsOn);
		const finalCursor = alignToWeekStart(end.minus({ days: 1 }), weekStartsOn);
		const result: Array<{
			index: number;
			startIso: string;
			days: Array<{
				iso: string;
				label: string;
				isCurrentYear: boolean;
				isToday: boolean;
				events: TrainingKeyEvent[];
			}>;
		}> = [];
		let index = 0;
		while (cursor <= finalCursor) {
			const startIso = cursor.toISODate()!;
			const days = Array.from({ length: 7 }, (_, dayIndex) => {
				const date = cursor.plus({ days: dayIndex });
				const iso = date.toISODate()!;
				return {
					iso,
					label: date.toFormat('MM/dd'),
						isCurrentYear: date >= start && date < end,
						isToday: iso === todayIso,
						events: eventMap[iso] ?? []
					};
				});
			result.push({ index: index + 1, startIso, days });
			index += 1;
			cursor = cursor.plus({ weeks: 1 });
		}
		return result;
	}

	const numericPattern = /^-?\d*(?:\.\d*)?$/;

	const sanitizeInput = (value: string) =>
		value.replace(/\u00a0/g, ' ').replace(/\r/g, '').replace(/\n/g, '').replace(/\t/g, ' ').trim();

	function updateBudgetValue(weekStart: string, rawValue: string, target?: HTMLElement) {
		const sanitized = sanitizeInput(rawValue);
		if (sanitized && !numericPattern.test(sanitized)) {
			if (target) {
				target.textContent = budgetsMap[weekStart] ?? '';
				restoreCaretToEnd(target);
			}
			return;
		}

		budgetsMap = {
			...budgetsMap,
			[weekStart]: sanitized
		};

		if (target) {
			restoreCaretToEnd(target);
		}
	}

	function restoreCaretToEnd(node: HTMLElement) {
		requestAnimationFrame(() => {
			const selection = window.getSelection();
			if (!selection) return;
			const range = document.createRange();
			range.selectNodeContents(node);
			range.collapse(false);
			selection.removeAllRanges();
			selection.addRange(range);
		});
	}

	function handleBudgetKeydown(event: KeyboardEvent, weekIndex: number) {
		const { key } = event;
		const lastIndex = weeks.length - 1;
		const goToIndex = (index: number) => {
			const cell = document.querySelector<HTMLElement>(`[data-budget-index="${index}"]`);
			cell?.focus();
		};

		switch (key) {
			case 'ArrowDown':
				event.preventDefault();
				goToIndex(Math.min(weekIndex + 1, lastIndex));
				break;
			case 'ArrowUp':
				event.preventDefault();
				goToIndex(Math.max(weekIndex - 1, 0));
				break;
			case 'Enter':
				event.preventDefault();
				goToIndex(Math.min(weekIndex + 1, lastIndex));
				break;
		}
	}

	function handleBudgetPaste(event: ClipboardEvent, weekIndex: number) {
		const text = event.clipboardData?.getData('text/plain');
		if (!text) return;
		const values = text.replace(/\r/g, '').split(/\n|\t/).filter(Boolean);
		if (!values.length) return;
		event.preventDefault();
		values.forEach((value, offset) => {
			const targetWeek = weeks[weekIndex + offset];
			if (!targetWeek) return;
			updateBudgetValue(targetWeek.startIso, value);
		});
	}

	function selectDate(dateIso: string) {
		selectedDate = dateIso;
	}

	function addEvent() {
		if (!draftEventName.trim() || !selectedDate) return;
	const newEvent: TrainingKeyEvent = {
		id: `temp-${randomId()}`,
			orgId,
			eventName: draftEventName.trim(),
			eventDate: selectedDate
		};
		events = [...events, newEvent];
		draftEventName = '';
	}

	function removeEvent(eventId: string) {
		const event = events.find((item) => item.id === eventId);
		if (!event) return;
		events = events.filter((item) => item.id !== eventId);
		if (!event.id.startsWith('temp-')) {
			const next = new Set(deletedEventIds);
			next.add(event.id);
			deletedEventIds = next;
		}
	}

	async function changeYear(offset: number) {
		const nextYear = currentYear + offset;
		await loadYear(nextYear);
	}

	async function loadYear(year: number) {
		try {
			loadingYear = true;
			const response = await fetch(
				`/api/training-budget?orgId=${orgId}&year=${year}`,
				{
					method: 'GET'
				}
			);
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
			const { start } = getCalendarYearRange(year, config.startMonth);
			selectedDate = start.toISODate()!;
			notification = null;
		} catch (error) {
			console.error(error);
			notification = { text: '年度データの取得に失敗しました。', tone: 'error' };
		} finally {
			loadingYear = false;
		}
	}

	async function saveAll() {
		saving = true;
		notification = null;

		try {
			const payload = {
				orgId,
				year: currentYear,
				config: {
					startMonth: config.startMonth,
					weekStartsOn: config.weekStartsOn
				},
				budgets: weeks.map((week) => ({
					allocatedOn: week.startIso,
					value: budgetsMap[week.startIso] ?? ''
				})),
				events: events.map((event) => ({
					id: event.id.startsWith('temp-') ? undefined : event.id,
					eventDate: event.eventDate,
					eventName: event.eventName
				})),
				deletedEventIds: Array.from(deletedEventIds)
			};

			const response = await fetch('/api/training-budget', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
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

			notification = { text: 'トレーニングバジェットを保存しました。', tone: 'success' };
		} catch (error) {
			console.error(error);
			notification = { text: '保存に失敗しました。', tone: 'error' };
		} finally {
			saving = false;
		}
	}

	const monthOptions = Array.from({ length: 12 }).map((_, index) => ({
		value: index + 1,
		label: `${index + 1}月`
	}));

const weekStartOptions = [
		{ value: 0, label: 'Mon' },
		{ value: 1, label: 'Tue' },
		{ value: 2, label: 'Wed' },
		{ value: 3, label: 'Thu' },
		{ value: 4, label: 'Fri' },
		{ value: 5, label: 'Sat' },
	{ value: 6, label: 'Sun' }
	];

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
			<button type="button" class="ghost" onclick={() => changeYear(-1)} disabled={loadingYear}>
				← 前年度
			</button>
			<span class="year-display">{currentYear}年度</span>
			<button type="button" class="ghost" onclick={() => changeYear(1)} disabled={loadingYear}>
				次年度 →
			</button>
			<button type="button" class="primary" onclick={saveAll} disabled={saving}>
				{saving ? '保存中...' : '保存する'}
			</button>
		</div>
	</header>

	<div class="config-panel">
		<div>
			<label for="start-month">年度開始月</label>
			<select
				id="start-month"
				bind:value={config.startMonth}
				onchange={(event) =>
					(config.startMonth = Number((event.currentTarget as HTMLSelectElement).value))}
			>
				{#each monthOptions as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>
		<div>
			<label for="week-start">週の開始曜日</label>
			<select
				id="week-start"
				bind:value={config.weekStartsOn}
				onchange={(event) =>
					(config.weekStartsOn = Number((event.currentTarget as HTMLSelectElement).value))}
			>
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
								class:selected-date={selectedDate === day.iso}
								class:today={day.isToday}
								class:outside={!day.isCurrentYear}
								onclick={() => selectDate(day.iso)}
							>
								<div class="day-label">{day.label}</div>
								{#if day.events.length}
									<ul class="events-list">
										{#each day.events.slice(0, 2) as event}
											<li>{event.eventName}</li>
										{/each}
										{#if day.events.length > 2}
											<li>+{day.events.length - 2}</li>
										{/if}
									</ul>
								{/if}
							</td>
						{/each}
						<td class="budget-cell">
							<div
								class="budget-editor"
								role="textbox"
								contenteditable="true"
								tabindex="0"
								spellcheck={false}
								data-budget-index={index}
								onfocus={(event) => restoreCaretToEnd(event.currentTarget as HTMLElement)}
								onkeydown={(event) => handleBudgetKeydown(event as KeyboardEvent, index)}
								onpaste={(event) => handleBudgetPaste(event as ClipboardEvent, index)}
								oninput={(event) =>
									updateBudgetValue(
										week.startIso,
										(event.currentTarget as HTMLElement).textContent ?? '',
										event.currentTarget as HTMLElement
									)}
							>
								{budgetsMap[week.startIso] ?? ''}
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<section class="events-panel">
		<div class="events-header">
			<h2>重要イベント</h2>
			<p>{formatDate(selectedDate)}</p>
		</div>
		<ul class="event-items">
			{#if eventsByDate[selectedDate]?.length}
				{#each eventsByDate[selectedDate] as event}
					<li>
						<span>{event.eventName}</span>
						<button type="button" class="link-button" onclick={() => removeEvent(event.id)}>
							削除
						</button>
					</li>
				{/each}
			{:else}
				<li class="empty">この日の登録はありません。</li>
			{/if}
		</ul>
		<div class="event-form">
			<input
				type="text"
				placeholder="イベント名を入力"
				bind:value={draftEventName}
				onkeydown={(event) => {
					if (event.key === 'Enter') {
						event.preventDefault();
						addEvent();
					}
				}}
			/>
			<button type="button" onclick={addEvent}>追加</button>
		</div>
	</section>
</section>

<style>
	.budget-page {
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
		padding: 0.5rem;
		vertical-align: top;
	}

	.week-label {
		background: #f8fafc;
		white-space: nowrap;
	}

	.day-label {
		font-weight: 600;
	}

	td.today {
		background: #eef2ff;
	}

	td.outside {
		background: #f8fafc;
		color: #94a3b8;
	}

	td.selected-date {
		outline: 2px solid #7c3aed;
		outline-offset: -2px;
	}

	.events-list {
		list-style: none;
		padding: 0;
		margin: 0.35rem 0 0;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		font-size: 0.75rem;
	}

	.budget-cell {
		min-width: 130px;
	}

	.budget-editor {
		min-height: 38px;
		padding: 0.4rem 0.5rem;
		border-radius: 6px;
		background: #fff;
		text-align: right;
		outline: none;
	}

	.budget-editor:focus {
		box-shadow: 0 0 0 2px #c7d2fe;
	}

	.events-panel {
		border: 1px solid #cbd5f5;
		border-radius: 12px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.events-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.event-items {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.event-items li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.4rem 0.6rem;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
	}

	.event-items li.empty {
		justify-content: center;
		color: #94a3b8;
		border-style: dashed;
	}

	.link-button {
		background: transparent;
		border: none;
		color: #dc2626;
		cursor: pointer;
	}

	.event-form {
		display: flex;
		gap: 0.5rem;
	}

	.event-form input {
		flex: 1;
		padding: 0.5rem 0.6rem;
		border-radius: 8px;
		border: 1px solid #cbd5f5;
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
