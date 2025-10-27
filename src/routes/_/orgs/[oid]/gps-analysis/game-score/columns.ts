import { DISPLAY_COLS, FOOTER_COLS } from '../upload/utils/headers.util';
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
	'継続時間(分)': 'KkLOxGTCHY2uVOMjLtQE',
	'総走行距離(m)': 'P6Zu5epLjDOaDQq20Stx',
	'1分当たり距離(m/min)': 'I7i8bessV96ciVnFw5IB',
	'最高速度(km/h)': 'Q4dPRJ2eqeNR0Bg4DI3E',
	'高強度距離(m)': 'Kn39OEkrpQCMQAtMQb5J',
	高強度割合: 'RObqK0yOMf4NXhiWig6p',
	スプリント回数: 'ZfqkRYcNfvwYioquCx5h',
	'スプリント距離(m)': 'mVykVPzBokSZ0l4C7YhJ',
	'Z1距離(m)': '0xbH1n71xspfVRddG92Q',
	ウォーキング割合: 'oOQMjHICxmf3nLwvDitk',
	加速Z5回数: 'kCZxKxfA9MfWVgBmdTbo',
	加速Z6回数: 'YR3ZEOZLTLwJk23XKVpj',
	加速合計回数: 'd4ZtXDD8O5ZjqnI8XqX3',
	爆発的加速回数: 'XLp9zGyDi0PgkNHn61ln',
	減速Z5回数: 'g60b48TuNLrtstb0dy65',
	減速Z6回数: 'mPoLSRIgbc1IwC3fPsP9',
	減速合計回数: 'D7aoPeenTMYu3CxfR6v7',
	爆発的減速回数: 'vMV5RRPagpuPxkoU8F2T',
	// 'トレーニングスコア消費': 'b3DroV7arY2KLRUJpdtq'
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
