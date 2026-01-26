import { COLUMN_LABELS, INTERMEDIATE_SCHEMA_COLS } from '../upload/utils/headers.util';
import type { GameScoreValueEntry } from '$lib/services/game-score.service';

export type ColumnSection = 'display' | 'footer';

export type GameScoreColumn = {
	label: string;
	key: string;
	metricDefinitionId?: string;
	section: ColumnSection;
	isNumeric: boolean;
};

export type GameScoreValues = Record<string, string>;

const createColumns = (metricDefinitionIds: string[], section: ColumnSection): GameScoreColumn[] =>
	metricDefinitionIds.map((metricDefinitionId) => {
		const label = COLUMN_LABELS[metricDefinitionId] ?? metricDefinitionId;
		return {
			label,
			key: metricDefinitionId,
			metricDefinitionId,
			section,
			isNumeric: true,
		};
	});

export const GAME_SCORE_COLUMNS: GameScoreColumn[] = [
	...createColumns(INTERMEDIATE_SCHEMA_COLS, 'display'),
];

export const createEmptyValues = (): GameScoreValues =>
	Object.fromEntries(GAME_SCORE_COLUMNS.map((column) => [column.key, '']));

const metricKeyMap = new Map(
	GAME_SCORE_COLUMNS.map((column) => [column.metricDefinitionId ?? column.key, column.key]),
);

export const valuesMapFromEntries = (entries?: GameScoreValueEntry[] | null): GameScoreValues => {
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

export const entriesFromValuesMap = (values: GameScoreValues): GameScoreValueEntry[] =>
	GAME_SCORE_COLUMNS.map((column) => {
		const metricDefinitionId = column.metricDefinitionId ?? column.key;
		const rawValue = values[column.key];
		const numericValue =
			rawValue === '' || rawValue === undefined || rawValue === null ? 0 : Number(rawValue);
		return {
			metricDefinitionId,
			value: Number.isFinite(numericValue) ? numericValue : 0,
		};
	});
