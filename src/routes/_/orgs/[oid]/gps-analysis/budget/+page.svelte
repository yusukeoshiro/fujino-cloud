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

	const weekDayLabels = ['月', '火', '水', '木', '金', '土', '日'];
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
		{ value: 0, label: '月' },
		{ value: 1, label: '火' },
		{ value: 2, label: '水' },
		{ value: 3, label: '木' },
		{ value: 4, label: '金' },
		{ value: 5, label: '土' },
		{ value: 6, label: '日' },
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
					label: date.toFormat('M月d日'),
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
		// Do not treat Enter during IME composition as submission
		if (event.isComposing) return;

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
				notification = { text: 'トレーニング予算を保存しました。', tone: 'success' };
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

<section class="mx-auto flex max-w-screen-2xl flex-col gap-4 px-4 py-6 text-slate-900">
	<!-- Header -->
	<header class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
		<div>
			<h1 class="text-xl font-semibold">トレーニング予算管理</h1>
			<p class="text-slate-600">年間の週次予算と重要イベントを一元管理します。</p>
		</div>
		<div class="flex items-center gap-2">
			<button
				type="button"
				class="rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
				onclick={() => void changeYear(-1)}
				disabled={loadingYear}
			>
				← 前年度
			</button>

			<span class="font-semibold">{currentYear}年度</span>

			<button
				type="button"
				class="rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
				onclick={() => void changeYear(1)}
				disabled={loadingYear}
			>
				次年度 →
			</button>

			<button
				type="button"
				class="rounded-lg bg-blue-600 px-3 py-2 text-white disabled:bg-slate-400"
				onclick={() => void queuePersist({ showToast: true })}
				disabled={saving || autoSaving}
			>
				{saving ? '保存中...' : autoSaving ? '自動保存中...' : '保存する'}
			</button>
		</div>
	</header>

	<!-- Config -->
	<div class="flex flex-col gap-3 sm:flex-row">
		<div>
			<label for="start-month" class="mb-1 block text-sm text-slate-700">年度開始月</label>
			<select
				id="start-month"
				bind:value={config.startMonth}
				onchange={() => queuePersist()}
				class="rounded-lg border border-slate-300 px-2 py-1"
			>
				{#each monthOptions as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>

		<div>
			<label for="week-start" class="mb-1 block text-sm text-slate-700">週の開始曜日</label>
			<select
				id="week-start"
				bind:value={config.weekStartsOn}
				onchange={() => queuePersist()}
				class="rounded-lg border border-slate-300 px-2 py-1"
			>
				{#each weekStartOptions as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>
	</div>

	<!-- Notification -->
	{#if notification}
		<div
			class="rounded-lg border px-3 py-2 font-medium"
			class:bg-emerald-50={notification.tone === 'success'}
			class:text-emerald-700={notification.tone === 'success'}
			class:border-emerald-300={notification.tone === 'success'}
			class:bg-red-50={notification.tone === 'error'}
			class:text-red-700={notification.tone === 'error'}
			class:border-red-300={notification.tone === 'error'}
		>
			{notification.text}
		</div>
	{/if}

	<!-- Calendar -->
	<div class="overflow-hidden rounded-xl border border-slate-300">
		<div class="max-h-[70vh] overflow-auto">
			<table class="w-full min-w-[1100px] table-fixed border-collapse text-sm">
				<colgroup>
					<col class="w-16" />
					<col span="7" class="w-[70px]" />
					<col class="w-20" />
				</colgroup>

				<thead class="sticky top-0 z-20 bg-white shadow-sm">
					<tr>
						<th class="border-b border-slate-200 px-2 py-2 text-center font-semibold">週#</th>
						{#each rotatedWeekdayLabels as label}
							<th class="border-b border-slate-200 px-2 py-2 text-center font-semibold">{label}</th>
						{/each}
						<th class="border-b border-slate-200 px-2 py-2 text-center font-semibold">
							<nobr>予算 </nobr><br />
							<small><nobr> (100が実践と同等の負荷)</nobr> </small>
						</th>
					</tr>
				</thead>

				<tbody>
					{#each weeks as week, index}
						<tr class="border-b border-slate-200 last:border-0">
							<th
								class="sticky left-0 border-r border-slate-200 bg-slate-50 px-2 py-2 whitespace-nowrap text-slate-800"
							>
								W{week.index}
							</th>

							{#each week.days as day}
								<td
									class={`relative h-[100px] p-0 align-top transition-colors hover:bg-slate-200
									`}
								>
									{#if day.isToday}
										<div class=" absolute h-full w-full bg-indigo-200"></div>
									{/if}

									<div
										class=" group absolute flex h-full w-full flex-col gap-1 p-2"
										class:bg-white={day.isCurrentYear && !day.isAltMonth && !day.isToday}
										class:bg-slate-50={day.isCurrentYear && day.isAltMonth && !day.isToday}
										class:bg-slate-100={!day.isCurrentYear && !day.isToday}
										class:text-slate-400={!day.isCurrentYear}
									>
										<div class="flex items-center justify-between">
											<span class="font-semibold">{day.label}</span>
											<button
												type="button"
												class="cursor-pointer rounded-full bg-gray-800 px-2 py-0.5 text-xs text-white opacity-0 transition group-hover:opacity-100"
												onclick={(event) => {
													event.stopPropagation();
													openAddEvent(day.iso);
												}}
											>
												＋
											</button>
										</div>

										{#if addEventFor === day.iso}
											<div
												class="absolute top-10 right-2 z-50 flex flex-col gap-2 rounded-md border border-slate-300 bg-white p-2 shadow-md"
											>
												<input
													type="text"
													placeholder="イベント名"
													bind:value={addEventDraft}
													bind:this={addEventInputEl}
													class="rounded border border-slate-300 px-2 py-1"
													onkeydown={(event) =>
														handleAddEventKeydown(event as KeyboardEvent, day.iso)}
												/>
												<div class="flex justify-end gap-1">
													<button
														class="rounded bg-blue-600 px-2 py-1 text-white"
														onclick={() => submitAddEvent(day.iso)}
													>
														追加
													</button>
													<button
														class="rounded border border-slate-300 px-2 py-1"
														onclick={cancelAddEvent}
													>
														キャンセル
													</button>
												</div>
											</div>
										{/if}

										<ul class="flex flex-1 flex-col gap-1 overflow-y-auto">
											{#each day.events.slice(0, 3) as event}
												<li class="group flex items-center gap-1">
													<div
														class="flex-1 rounded-full bg-slate-100 px-2 py-1 text-left text-xs"
														title={event.eventName}
													>
														{event.eventName}
													</div>

													<button
														class="cursor-pointer text-xs text-red-600 opacity-0 transition-opacity group-hover:opacity-100"
														onclick={(e) => {
															e.stopPropagation();
															removeEvent(event.id, day.iso);
														}}
													>
														✕
													</button>
												</li>
											{/each}
											{#if day.events.length > 3}
												<li
													class="rounded-full bg-slate-100 px-2 py-0.5 text-center text-xs text-slate-700"
												>
													+{day.events.length - 3}
												</li>
											{/if}
										</ul>
									</div>
								</td>
							{/each}

							<td class="relative w-full p-0 align-top">
								{#if editingBudgetIndex === index}
									<div class="absolute inset-0">
										<div
											contenteditable="true"
											role="textbox"
											tabindex="0"
											spellcheck={false}
											class="absolute inset-0 flex items-center justify-end bg-white px-6 py-2 text-right ring-2 ring-indigo-200 outline-none"
											style="min-height:100%;"
											data-budget-index={index}
											bind:this={budgetEditorEl}
											oninput={(ev) => handleEditorInput(ev)}
											onkeydown={(ev) => handleEditorKeydown(ev as KeyboardEvent, index)}
											onpaste={(ev) => handleEditorPaste(ev as ClipboardEvent, index)}
											onblur={() => void commitEditing('stay')}
										></div>
									</div>
								{:else}
									<button
										type="button"
										class="absolute inset-0 flex w-full items-center justify-end px-6 py-2 text-right hover:bg-slate-100 focus-visible:outline focus-visible:outline-blue-600"
										class:bg-blue-50={selectedBudgetIndex === index}
										data-budget-index={index}
										tabindex={selectedBudgetIndex === index ? 0 : -1}
										onclick={() => handleBudgetCellClick(index)}
										ondblclick={() => void startEditing(index, { selectMode: 'all' })}
										onkeydown={(ev) => handleSelectionKeydown(ev as KeyboardEvent, index)}
										onpaste={(ev) => handleSelectionPaste(ev as ClipboardEvent, index)}
									>
										{budgetsMap[week.startIso] ?? ''}
									</button>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</section>
