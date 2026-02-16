<script lang="ts">
	import type { PageData } from './$types';
	import type {
		TrainingBudgetConfig,
		TrainingKeyEvent,
	} from '$lib/services/training-budget.service';
	import { t, locale } from '$lib/i18n';
	import { toast } from 'svelte-sonner';
	import {
		groupEvents,
		mapBudgets,
		buildWeeks,
		isValidNumericInput,
		randomId,
		sanitizeInput,
	} from './budget.utils';
	import PageHeader from './components/PageHeader.svelte';
	import BudgetConfig from './components/BudgetConfig.svelte';
	import BudgetSpreadsheet from './components/BudgetSpreadsheet.svelte';

	let { data }: { data: PageData } = $props();

	const orgId = data.orgId;
	const todayIso = data.today;

	let config = $state<TrainingBudgetConfig>({
		...data.config,
		startMonth: Number(data.config.startMonth),
		weekStartsOn: Number(data.config.weekStartsOn),
	});
	let currentYear = $state<number>(data.year);
	let budgetsMap = $state<Record<string, string>>(mapBudgets(data.budgets));
	let events = $state<TrainingKeyEvent[]>([...data.events]);
	let deletedEventIds = $state<Set<string>>(new Set());
	let saving = $state(false);
	let autoSaving = $state(false);
	let loadingYear = $state(false);
	let saveQueue: Promise<void> = Promise.resolve();

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
			todayIso,
		),
	);

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

	function updateBudgetValue(weekStart: string, rawValue: string) {
		const sanitized = sanitizeInput(rawValue);
		if (sanitized && !isValidNumericInput(sanitized)) return;
		budgetsMap = { ...budgetsMap, [weekStart]: sanitized };
		void queuePersist();
	}

	function submitAddEvent(date: string, name: string) {
		if (!name) return;
		events = [...events, { id: `temp-${randomId()}`, orgId, eventDate: date, eventName: name }];
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
		if (showToast) saving = true;
		else autoSaving = true;

		try {
			const payload = {
				year: currentYear,
				config: { startMonth: config.startMonth, weekStartsOn: config.weekStartsOn },
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

			if (!response.ok) throw new Error('Failed to save training budget');

			const data = await response.json();
			config.startMonth = data.config.startMonth;
			config.weekStartsOn = data.config.weekStartsOn;
			budgetsMap = mapBudgets(data.budgets);
			events = data.events;
			deletedEventIds = new Set();
			toast.success($t('gps.budget.saved'));
		} catch (error) {
			console.error(error);
			toast.error($t('gps.budget.saveFailed'));
		} finally {
			if (showToast) saving = false;
			else autoSaving = false;
		}
	}

	async function changeYear(offset: number) {
		const nextYear = currentYear + offset;
		try {
			loadingYear = true;
			const response = await fetch(
				`/api/gps-conditioning/training-budgets?orgId=${encodeURIComponent(orgId)}&year=${nextYear}`,
			);
			if (!response.ok) throw new Error('Failed to load year data');
			const payload = await response.json();
			currentYear = nextYear;
			config.startMonth = payload.config.startMonth;
			config.weekStartsOn = payload.config.weekStartsOn;
			budgetsMap = mapBudgets(payload.budgets);
			events = payload.events;
			deletedEventIds = new Set();
		} catch (error) {
			console.error(error);
			toast.error($t('gps.budget.fetchFailed'));
		} finally {
			loadingYear = false;
		}
	}
</script>

<section class="mx-auto flex max-w-screen-2xl flex-col gap-4 px-4 py-6 text-slate-900">
	<PageHeader
		{currentYear}
		{loadingYear}
		{saving}
		{autoSaving}
		onChangeYear={changeYear}
		onSave={() => void queuePersist({ showToast: true })}
	/>

	<BudgetConfig
		bind:config
		{monthOptions}
		{weekStartOptions}
		onChange={() => void queuePersist()}
	/>

	<BudgetSpreadsheet
		{weeks}
		{rotatedWeekdayLabels}
		bind:budgetsMap
		onUpdateBudget={updateBudgetValue}
		onAddEvent={submitAddEvent}
		onRemoveEvent={removeEvent}
	/>
</section>
