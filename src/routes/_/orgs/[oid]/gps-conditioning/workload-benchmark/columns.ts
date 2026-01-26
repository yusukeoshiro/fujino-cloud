import { INTERMEDIATE_SCHEMA_COLS } from '../upload/utils/headers.util';
import { buildMetricLabels } from '$lib/contents-provider/metric-labels';
import type { WorkloadBenchmarkValueEntry } from '$lib/services/workload-benchmark.service';

export type ColumnSection = 'display' | 'footer';

export type WorkloadBenchmarkColumn = {
	label: string;
	key: string;
	metricDefinitionId?: string;
	section: ColumnSection;
	isNumeric: boolean;
};

export type WorkloadBenchmarkValues = Record<string, string>;

const metricNameById = buildMetricLabels();
const createColumns = (
	metricDefinitionIds: string[],
	section: ColumnSection,
): WorkloadBenchmarkColumn[] =>
	metricDefinitionIds.map((metricDefinitionId) => {
		const label = metricNameById.get(metricDefinitionId) ?? metricDefinitionId;
		return {
			label,
			key: metricDefinitionId,
			metricDefinitionId,
			section,
			isNumeric: true,
		};
	});

export const WORKLOAD_BENCHMARK_COLUMNS: WorkloadBenchmarkColumn[] = [
	...createColumns(INTERMEDIATE_SCHEMA_COLS, 'display'),
];

export const createEmptyValues = (): WorkloadBenchmarkValues =>
	Object.fromEntries(WORKLOAD_BENCHMARK_COLUMNS.map((column) => [column.key, '']));

const metricKeyMap = new Map(
	WORKLOAD_BENCHMARK_COLUMNS.map((column) => [column.metricDefinitionId ?? column.key, column.key]),
);

export const valuesMapFromEntries = (
	entries?: WorkloadBenchmarkValueEntry[] | null,
): WorkloadBenchmarkValues => {
	const values = createEmptyValues();
	if (!entries) return values;

	for (const entry of entries) {
		if (!entry || !entry.metricDefinitionId) continue;
		const key = metricKeyMap.get(entry.metricDefinitionId);
		if (!key) continue;
		values[key] = entry.value === undefined || entry.value === null ? '' : entry.value.toString();
	}

	return values;
};

export const entriesFromValuesMap = (
	values: WorkloadBenchmarkValues,
): WorkloadBenchmarkValueEntry[] =>
	WORKLOAD_BENCHMARK_COLUMNS.map((column) => {
		const metricDefinitionId = column.metricDefinitionId ?? column.key;
		const rawValue = values[column.key];
		const numericValue =
			rawValue === '' || rawValue === undefined || rawValue === null ? 0 : Number(rawValue);
		return {
			metricDefinitionId,
			value: Number.isFinite(numericValue) ? numericValue : 0,
		};
	});
