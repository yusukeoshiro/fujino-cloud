<script lang="ts">
	import { t } from '$lib/i18n';
	import jspreadsheet from 'jspreadsheet-ce';
	import 'jspreadsheet-ce/dist/jspreadsheet.css';
	import { onMount, onDestroy, mount, unmount } from 'svelte';
	import DayCell from './DayCell.svelte';
	import { isValidNumericInput } from '../budget.utils';
	import type { TrainingKeyEvent } from '$lib/services/training-budget.service';

	interface Props {
		weeks: Array<{
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
		}>;
		rotatedWeekdayLabels: string[];
		budgetsMap: Record<string, string>;
		onUpdateBudget: (weekStart: string, value: string) => void;
		onAddEvent: (date: string, name: string) => void;
		onRemoveEvent: (id: string) => void;
	}

	let {
		weeks,
		rotatedWeekdayLabels,
		budgetsMap = $bindable(),
		onUpdateBudget,
		onAddEvent,
		onRemoveEvent,
	}: Props = $props();

	let spreadsheetContainer: HTMLDivElement;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let spreadsheetInstance: any = null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let mountedComponents: Set<any> = new Set();
	let resizeObserver: ResizeObserver;

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

	function resizeTable() {
		if (!spreadsheetContainer || !spreadsheetInstance) return;
		const containerWidth = spreadsheetContainer.clientWidth;
		if (containerWidth === 0) return;

		// Fixed widths: RowHeader (~50px) + WeekCol (50px) + BudgetCol (100px) + scrollbar buffer (~20px)
		const fixedWidths = 50 + 50 + 100 + 20;
		const availableWidth = containerWidth - fixedWidths;
		const dayWidth = Math.max(100, Math.floor(availableWidth / 7));

		// Update day columns (indices 1-7)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const instance = (spreadsheetInstance as any)[0];
		if (instance && instance.setWidth) {
			for (let i = 1; i <= 7; i++) {
				instance.setWidth(i, dayWidth);
			}
		}
	}

	function initSpreadsheet() {
		if (!spreadsheetContainer) return;

		// Save current scroll position
		const currentScrollY = window.scrollY;

		// Prevent layout shift/collapse by setting min-height
		const rect = spreadsheetContainer.getBoundingClientRect();
		if (rect.height > 0) {
			spreadsheetContainer.style.minHeight = `${rect.height}px`;
		}

		// Cleanup previous
		if (spreadsheetInstance) {
			try {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				jspreadsheet.destroy(spreadsheetContainer as any, true);
			} catch (e) {
				console.warn(e);
			}
			cleanupMountedComponents();
			spreadsheetInstance = null;
		}
		spreadsheetContainer.innerHTML = '';

		// Prepare data
		const dataArray = weeks.map((week) => {
			const row = [`W${week.index}`, ...Array(7).fill(''), budgetsMap[week.startIso] ?? ''];
			return row;
		});

		// Config with renderers
		const cols = [
			{
				type: 'text' as const,
				title: $t('gps.budget.weekNumber'),
				width: 50,
				readOnly: true,
				align: 'center' as const,
			},
			...rotatedWeekdayLabels.map((label, dayIndex) => ({
				type: 'text' as const,
				title: label,
				width: 140,
				readOnly: true,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				render: (cell: HTMLElement, value: any, x: number, y: number) => {
					cell.innerHTML = '';
					const week = weeks[y];
					if (!week) return;
					const day = week.days[dayIndex];
					if (!day) return;

					// Mount DayCell
					const comp = mount(DayCell, {
						target: cell,
						props: {
							day,
							onRemoveEventClick: (id) => onRemoveEvent(id),
							onAddEventSubmit: (date, name) => onAddEvent(date, name),
						},
					});
					mountedComponents.add(comp);
				},
			})),
			{
				type: 'text' as const,
				title: $t('gps.budget.budget'),
				width: 100,
			},
		];

		try {
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
						tableWidth: '100%',
						tableOverflow: true,
					},
				],
				contextMenu: () => [],
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				onchange: async (instance, cell, x, y, value) => {
					const colIndex = parseInt(String(x));
					const rowIndex = parseInt(String(y));
					const budgetColIndex = 8;
					if (colIndex === budgetColIndex) {
						const week = weeks[rowIndex];
						if (week) {
							if (!isValidNumericInput(String(value))) {
								spreadsheetInstance?.[0]?.setValueFromCoords(
									colIndex,
									rowIndex,
									budgetsMap[week.startIso] ?? '',
									false,
								);
								return;
							}
							onUpdateBudget(week.startIso, String(value));
						}
					}
				},
			});
		} catch (e) {
			console.error(e);
		}

		resizeTable();

		// Restore scroll position and clean up min-height
		if (currentScrollY > 0) {
			window.scrollTo(0, currentScrollY);
		}

		setTimeout(() => {
			if (currentScrollY > 0) {
				window.scrollTo(0, currentScrollY);
			}
			if (spreadsheetContainer) {
				spreadsheetContainer.style.minHeight = '';
			}
		}, 0);
	}

	// Update spreadsheet when data changes
	$effect(() => {
		if (weeks.length > 0) {
			initSpreadsheet();
		}
	});

	onMount(() => {
		initSpreadsheet();
		resizeObserver = new ResizeObserver(() => {
			resizeTable();
		});
		if (spreadsheetContainer) {
			resizeObserver.observe(spreadsheetContainer);
		}
	});

	onDestroy(() => {
		if (resizeObserver) {
			resizeObserver.disconnect();
		}
		if (spreadsheetInstance) {
			try {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				jspreadsheet.destroy(spreadsheetContainer as any, true);
			} catch (e) {
				// ignore
			}
		}
		cleanupMountedComponents();
	});
</script>

<div class="rounded-xl border border-slate-300 p-2">
	<div bind:this={spreadsheetContainer} class="w-full"></div>
</div>

<style>
	:global(.jexcel) {
		width: 100% !important;
	}
	:global(.jexcel td) {
		vertical-align: top;
	}
	:global(.jexcel thead) {
		position: sticky;
		top: 0;
		z-index: 10;
	}
	:global(.jexcel thead td) {
		background-color: #f8fafc;
		box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
	}
</style>
