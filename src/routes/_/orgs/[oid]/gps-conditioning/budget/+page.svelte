<script lang="ts">
	import { tick, onMount, onDestroy, mount, unmount } from 'svelte';
	import type { PageData } from './$types';
	import type {
		TrainingBudgetConfig,
		TrainingKeyEvent,
		WeeklyTrainingBudget,
	} from '$lib/services/training-budget.service';
	import { alignToWeekStart, getCalendarYearRange } from '$lib/utils/calendar.util';
	import { locale, t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import jspreadsheet from 'jspreadsheet-ce';
	import 'jspreadsheet-ce/dist/jspreadsheet.css';
	import DayCell from './day-cell.svelte';

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

	let spreadsheetContainer: HTMLDivElement;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let spreadsheetInstance: any = null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let mountedComponents: Set<any> = new Set();

	const translate = (key: string, vars?: Record<string, string | number>) => get(t)(key, vars);

	const weekDayLabels = $derived([
		$t('gps.budget.weekday.mon'),
		$t('gps.budget.weekday.tue'),
		$t('gps.budget.weekday.wed'),
		$t('gps.budget.weekday.thu'),
		$t('gps.budget.weekday.fri'),
		$t('gps.budget.weekday.sat'),
		$t('gps.budget.weekday.sun'),
	]);
	const rotatedWeekdayLabels = $derived(
		weekDayLabels.map(
			(_, index) => weekDayLabels[(index + config.weekStartsOn) % weekDayLabels.length],
		),
	);

	const dateLabelFormat = $derived(
		$locale === 'ja' ? 'M月d日' : $locale === 'ko' ? 'M월 d일' : 'MMM d',
	);

	const eventsByDate = $derived(groupEvents(events));
	const weeks = $derived(
		buildWeeks(
			currentYear,
			config.weekStartsOn,
			config.startMonth,
			eventsByDate,
			dateLabelFormat,
			$locale,
		),
	);

	let addEventFor = $state<string | null>(null);

	let saveQueue: Promise<void> = Promise.resolve();
	const numericPattern = /^-?\d*(?:\.\d*)?$/;

	const monthOptions = $derived(
		Array.from({ length: 12 }).map((_, index) => ({
			value: index + 1,
			label: $t('gps.budget.monthLabel', { month: index + 1 }),
		})),
	);

	const weekStartOptions = $derived(
		weekDayLabels.map((label, index) => ({
			value: index,
			label,
		})),
	);

	// Update spreadsheet when data changes
	$effect(() => {
		if (spreadsheetInstance && weeks.length > 0) {
			updateSpreadsheetData();
		}
	});

	function cleanupMountedComponents() {
		mountedComponents.forEach((comp) => {
			try {
				unmount(comp);
			} catch (e) {
				// Ignore unmount errors
			}
		});
		mountedComponents.clear();
	}

	function initSpreadsheet() {
		if (!spreadsheetContainer) return;
		if (spreadsheetInstance) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			jspreadsheet.destroy(spreadsheetContainer as any, true);
			cleanupMountedComponents();
		}

		// Prepare columns
		const columnsConfig = [
			{
				type: 'text' as const,
				title: $t('gps.budget.weekNumber'),
				width: 60,
				readOnly: true,
			},
			...rotatedWeekdayLabels.map((label) => ({
				type: 'text' as const,
				title: label,
				width: 120,
				readOnly: true, // Interaction handled by component
			})),
			{
				type: 'text' as const, // Using text for numeric input to allow empty string
				title: $t('gps.budget.budget'),
				width: 100,
			},
		];

		const dataArray = weeks.map((week) => {
			const row = [
				`W${week.index}`,
				...Array(7).fill(''), // Placeholders for days
				budgetsMap[week.startIso] ?? '',
			];
			return row;
		});

		spreadsheetInstance = jspreadsheet(spreadsheetContainer, {
			worksheets: [
				{
					data: dataArray,
					columns: columnsConfig,
					minDimensions: [columnsConfig.length, 1],
					allowInsertRow: false,
					allowManualInsertRow: false,
					allowInsertColumn: false,
					allowManualInsertColumn: false,
					allowDeleteRow: false,
					allowDeleteColumn: false,
					minSpareRows: 0,
				},
			],
			contextMenu: () => [],
			onchange: async (instance, cell, x, y, value) => {
				const colIndex = parseInt(String(x));
				const rowIndex = parseInt(String(y));
				const budgetColIndex = 8; // 0(Week) + 7(Days) = 8

				if (colIndex === budgetColIndex) {
					// Budget change
					const week = weeks[rowIndex];
					if (week) {
						if (!isValidNumericInput(String(value))) {
							// Revert if invalid
							spreadsheetInstance?.setValueFromCoords(
								colIndex,
								rowIndex,
								budgetsMap[week.startIso] ?? '',
								false,
							);
							return;
						}
						// Update state
						updateBudgetValue(week.startIso, String(value));
						// Trigger save
						void queuePersist();
					}
				}
			},
		});

		// Custom renderers are not directly supported in config purely as functions in all versions,
		// but we can post-process or use updateTable event.
		// Actually jspreadsheet-ce v5 supports `render` method in column config?
		// Checking types... generic Column type has `render`?
		// The types show `render?: (cell: HTMLElement, value: any, x: number, y: number, instance: any, options: any) => void;`
		// So we can attach it to the columns in `options` or modifying them after.
		// However, initializing with `render` in columns is cleaner. Let's re-do init with render.
		// But wait, I can't pass `render` in definition if I want to recreate it easily.
		// Let's destroy and recreate for now, but to avoid flash, maybe update config?
		// jspreadsheet v5 structure: options -> worksheets -> [ { columns: [...] } ]
		// We can inject render function into the columnsConfig above.

		// Let's modify columnsConfig to include render
		// Re-defining columnsConfig with proper renderers
		const cols = [
			{
				type: 'text' as const,
				title: $t('gps.budget.weekNumber'),
				width: 80,
				readOnly: true,
				align: 'center' as const,
			},
			...rotatedWeekdayLabels.map((label, dayIndex) => ({
				type: 'text' as const,
				title: label,
				width: 140,
				readOnly: true,
				render: (cell: HTMLElement, value: any, x: number, y: number) => {
					cell.innerHTML = '';
					const week = weeks[y];
					if (!week) return;
					const day = week.days[dayIndex]; // dayIndex 0-6 corresponds to columns 1-7
					if (!day) return;

					// Mount DayCell
					const comp = mount(DayCell, {
						target: cell,
						props: {
							day,
							addEventFor,
							onAddEventClick: (date) => openAddEvent(date),
							onRemoveEventClick: (id) => removeEvent(id),
							onAddEventSubmit: (date, name) => submitAddEvent(date, name),
							onAddEventCancel: () => cancelAddEvent(),
						},
					});
					mountedComponents.add(comp);
				},
			})),
			{
				type: 'text' as const,
				title: $t('gps.budget.budget'),
				width: 120,
			},
		];

		// Re-initialize with renderers
		if (spreadsheetInstance) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			jspreadsheet.destroy(spreadsheetContainer as any, true);
			cleanupMountedComponents();
		}

		spreadsheetInstance = jspreadsheet(spreadsheetContainer, {
			worksheets: [
				{
					data: dataArray,
					columns: cols,
					minDimensions: [cols.length, 1],
					allowInsertRow: false,
					allowManualInsertRow: false,
					allowInsertColumn: false,
					allowManualInsertColumn: false,
					allowDeleteRow: false,
					allowDeleteColumn: false,
					minSpareRows: 0,
					// Freeze the first column (Week number)? Not supported in CE simply without pro ext usually, checking docs.. CE might not support `freezeColumns`.
					// tableOverflow: true,
					// tableWidth: '100%',
					// tableHeight: '70vh',
				},
			],
			contextMenu: () => [],
			onchange: async (instance, cell, x, y, value) => {
				const colIndex = parseInt(String(x));
				const rowIndex = parseInt(String(y));
				const budgetColIndex = 8;
				if (colIndex === budgetColIndex) {
					const week = weeks[rowIndex];
					if (week) {
						if (!isValidNumericInput(String(value))) {
							// Revert if invalid
							spreadsheetInstance?.[0].setValueFromCoords(
								colIndex,
								rowIndex,
								budgetsMap[week.startIso] ?? '',
								false,
							);
							return;
						}
						updateBudgetValue(week.startIso, String(value));
						void queuePersist();
					}
				}
			},
		});
	}

	function updateSpreadsheetData() {
		// Full refresh of spreadsheet to handle day component updates (events)
		// This is expensive but reliable for Svelte integration.
		// Optimally we would only update changed cells, but with `render` logic dependent on `weeks` state which changes on event add/remove,
		// re-rendering the visible cells is needed.
		// `jspreadsheet` doesn't strictly have a "redraw" for custom renderers unless data changes.
		// If we destroy and init, we lose selection and scroll.
		// Better: Update data where needed.
		// For Day cells, since they are pure renderers based on `weeks`, if `weeks` changes, we need to trigger re-render.
		// Calling `setValue(..., force)` might trigger render?
		// Actually, simpler approach: Just re-init for now to ensure correctness, preserving year.
		// Losing selection is acceptable for "Add Event" which closes modal anyway.
		initSpreadsheet();
	}

	onMount(() => {
		initSpreadsheet();
	});

	onDestroy(() => {
		if (spreadsheetInstance) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			jspreadsheet.destroy(spreadsheetContainer as any, true);
		}
		cleanupMountedComponents();
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
		labelFormat: string,
		localeValue: string,
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
					label: date.setLocale(localeValue).toFormat(labelFormat),
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
			.replace(/\\u00a0/g, ' ')
			.replace(/\\r/g, '')
			.replace(/\\n/g, '')
			.replace(/\\t/g, ' ')
			.trim();

	const isValidNumericInput = (value: string) => value === '' || numericPattern.test(value);

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

	function openAddEvent(date: string) {
		addEventFor = date;
		void tick().then(() => {
			// Focus handled by DayCell effect or local logic
			updateSpreadsheetData(); // Trigger re-render to show input
		});
	}

	function cancelAddEvent() {
		addEventFor = null;
		updateSpreadsheetData();
	}

	function submitAddEvent(date: string, name: string) {
		if (!name) return;
		events = [...events, { id: `temp-${randomId()}`, orgId, eventDate: date, eventName: name }];
		addEventFor = null;
		queuePersist();
	}

	function removeEvent(eventId: string) {
		const event = events.find((item) => item.id === eventId);
		if (!event) return;
		events = events.filter((item) => item.id !== eventId);
		if (!event.id.startsWith('temp-')) {
			// eslint-disable-next-line svelte/prefer-svelte-reactivity
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

			const response = await fetch(
				`/api/gps-conditioning/training-budgets/set?orgId=${encodeURIComponent(orgId)}`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				},
			);

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
				notification = { text: translate('gps.budget.saved'), tone: 'success' };
			}
		} catch (error) {
			console.error(error);
			notification = { text: translate('gps.budget.saveFailed'), tone: 'error' };
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
			const response = await fetch(
				`/api/gps-conditioning/training-budgets?orgId=${encodeURIComponent(orgId)}&year=${year}`,
				{
					method: 'GET',
				},
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

			addEventFor = null;
			notification = null;
			await tick();
			// Spreadsheet update handled by effect on `weeks` or manual init?
			// `weeks` is derived from `currentYear`, so it will change.
		} catch (error) {
			console.error(error);
			notification = { text: translate('gps.budget.fetchFailed'), tone: 'error' };
		} finally {
			loadingYear = false;
		}
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
			<h1 class="text-xl font-semibold">{$t('gps.budget.title')}</h1>
			<p class="text-slate-600">{$t('gps.budget.description')}</p>
		</div>
		<div class="flex items-center gap-2">
			<button
				type="button"
				class="rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
				onclick={() => void changeYear(-1)}
				disabled={loadingYear}
			>
				{$t('gps.budget.prevYear')}
			</button>

			<span class="font-semibold">{$t('gps.budget.fiscalYear', { year: currentYear })}</span>

			<button
				type="button"
				class="rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
				onclick={() => void changeYear(1)}
				disabled={loadingYear}
			>
				{$t('gps.budget.nextYear')}
			</button>

			<button
				type="button"
				class="rounded-lg bg-blue-600 px-3 py-2 text-white disabled:bg-slate-400"
				onclick={() => void queuePersist({ showToast: true })}
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

	<!-- Config -->
	<div class="flex flex-col gap-3 sm:flex-row">
		<div>
			<label for="start-month" class="mb-1 block text-sm text-slate-700">
				{$t('gps.budget.startMonth')}
			</label>
			<select
				id="start-month"
				bind:value={config.startMonth}
				onchange={() => queuePersist()}
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
				onchange={() => queuePersist()}
				class="rounded-lg border border-slate-300 px-2 py-1"
			>
				{#each weekStartOptions as option (option.value)}
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

	<!-- Spreadsheet -->
	<div class="overflow-hidden rounded-xl border border-slate-300">
		<div bind:this={spreadsheetContainer} class="w-full"></div>
	</div>
</section>

<style>
	:global(.jexcel) {
		width: 100% !important;
	}
	:global(.jexcel td) {
		vertical-align: top;
	}
</style>
