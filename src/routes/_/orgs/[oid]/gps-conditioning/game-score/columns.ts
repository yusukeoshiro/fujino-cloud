import { DISPLAY_COLS } from '../upload/utils/headers.util';
import { METRIC_DEFINITION_IDS } from '$lib/constants/metric-definition-ids';
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

const METRIC_ID_BY_LABEL: Record<string, string> = {
	'継続時間(分)': METRIC_DEFINITION_IDS.durationMin,
	'総走行距離(m)': METRIC_DEFINITION_IDS.totalDistanceM,
	'1分当たり距離(m/min)': METRIC_DEFINITION_IDS.totalDistancePerMin,
	'最高速度(km/h)': METRIC_DEFINITION_IDS.maxSpeedKMH,
	'高強度距離(m)': METRIC_DEFINITION_IDS.highIntensityM,
	高強度割合: METRIC_DEFINITION_IDS.highIntensityRate,
	スプリント回数: METRIC_DEFINITION_IDS.noOfSprint,
	'スプリント距離(m)': METRIC_DEFINITION_IDS.sprintDistanceM,
	'Z1距離(m)': METRIC_DEFINITION_IDS.speedZone1DistanceM,
	ウォーキング割合: METRIC_DEFINITION_IDS.walkingRate,
	加速Z5回数: METRIC_DEFINITION_IDS.accelerationZone5EntryCount,
	加速Z6回数: METRIC_DEFINITION_IDS.accelerationZone6EntryCount,
	加速合計回数: METRIC_DEFINITION_IDS.accelerationCountTotal,
	爆発的加速回数: METRIC_DEFINITION_IDS.noOfExpAcc,
	減速Z5回数: METRIC_DEFINITION_IDS.decelerationZone5EntryCount,
	減速Z6回数: METRIC_DEFINITION_IDS.decelerationZone6EntryCount,
	減速合計回数: METRIC_DEFINITION_IDS.decelerationCountTotal,
	爆発的減速回数: METRIC_DEFINITION_IDS.noOfExpDec,
	// 'トレーニングスコア消費': METRIC_DEFINITION_IDS.trainingScoreConsumption
};

const createColumns = (labels: string[], section: ColumnSection): GameScoreColumn[] =>
	labels.map((label) => {
		const metricDefinitionId = METRIC_ID_BY_LABEL[label];
		return {
			label,
			key: metricDefinitionId ?? label,
			metricDefinitionId,
			section,
			isNumeric: true,
		};
	});

export const GAME_SCORE_COLUMNS: GameScoreColumn[] = [...createColumns(DISPLAY_COLS, 'display')];

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
