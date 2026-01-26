import { METRIC_DEFINITION_IDS } from '$lib/constants/metric-definition-ids';

export const HEADER_COLS: string[] = ['fullName'];

export const FOOTER_COLS: string[] = [METRIC_DEFINITION_IDS.trainingScoreConsumption];

export const INTERMEDIATE_SCHEMA_COLS: string[] = [
	METRIC_DEFINITION_IDS.durationMin,
	METRIC_DEFINITION_IDS.totalDistanceM,
	METRIC_DEFINITION_IDS.totalDistanceMPerMin,
	METRIC_DEFINITION_IDS.maxSpeedKMH,
	METRIC_DEFINITION_IDS.noOfHSR,
	METRIC_DEFINITION_IDS.hsrDistanceM,
	METRIC_DEFINITION_IDS.sprintCount,
	METRIC_DEFINITION_IDS.sprintDistanceM,
	METRIC_DEFINITION_IDS.highIntensityDistanceM,
	METRIC_DEFINITION_IDS.highIntensityRate,
	METRIC_DEFINITION_IDS.lowIntensityRate,
	METRIC_DEFINITION_IDS.accelerationCountTotal,
	METRIC_DEFINITION_IDS.expAccCount,
	METRIC_DEFINITION_IDS.decelerationCountTotal,
	METRIC_DEFINITION_IDS.expDecCount,
];

export const COLUMN_LABELS: Record<string, string> = {
	fullName: '氏名',
	[METRIC_DEFINITION_IDS.trainingScoreConsumption]: 'トレーニングスコア消費',
	[METRIC_DEFINITION_IDS.durationMin]: '継続時間(分)',
	[METRIC_DEFINITION_IDS.totalDistanceM]: '総走行距離(m)',
	[METRIC_DEFINITION_IDS.totalDistanceMPerMin]: '1分当たり距離(m/min)',
	[METRIC_DEFINITION_IDS.maxSpeedKMH]: '最高速度(km/h)',
	[METRIC_DEFINITION_IDS.noOfHSR]: 'HSR回数',
	[METRIC_DEFINITION_IDS.hsrDistanceM]: 'HSR距離(m)',
	[METRIC_DEFINITION_IDS.sprintCount]: 'スプリント回数',
	[METRIC_DEFINITION_IDS.sprintDistanceM]: 'スプリント距離(m)',
	[METRIC_DEFINITION_IDS.highIntensityDistanceM]: '高強度距離(m)',
	[METRIC_DEFINITION_IDS.highIntensityRate]: '高強度割合',
	[METRIC_DEFINITION_IDS.lowIntensityRate]: 'ウォーキング割合',
	[METRIC_DEFINITION_IDS.accelerationCountTotal]: '加速合計回数',
	[METRIC_DEFINITION_IDS.expAccCount]: '爆発的加速回数',
	[METRIC_DEFINITION_IDS.decelerationCountTotal]: '減速合計回数',
	[METRIC_DEFINITION_IDS.expDecCount]: '爆発的減速回数',
};
