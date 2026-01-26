import { METRIC_DEFINITION_IDS } from '$lib/constants/metric-definition-ids';

export const trainigMetricDefinitionIds = [
	METRIC_DEFINITION_IDS.durationMin,
	METRIC_DEFINITION_IDS.totalDistanceM,
	METRIC_DEFINITION_IDS.totalDistanceMPerMin,
	METRIC_DEFINITION_IDS.maxSpeedKMH,
	METRIC_DEFINITION_IDS.highIntensityDistanceM,
	METRIC_DEFINITION_IDS.highIntensityRate,
	METRIC_DEFINITION_IDS.sprintCount,
	METRIC_DEFINITION_IDS.sprintDistanceM,
	METRIC_DEFINITION_IDS.lowIntensityRate,
	METRIC_DEFINITION_IDS.accelerationCountTotal,
	METRIC_DEFINITION_IDS.expAccCount,
	METRIC_DEFINITION_IDS.decelerationCountTotal,
	METRIC_DEFINITION_IDS.expDecCount,
	METRIC_DEFINITION_IDS.noOfHSR,
	METRIC_DEFINITION_IDS.hsrDistanceM,
	METRIC_DEFINITION_IDS.trainingScoreConsumption,
];

export const FIELD_ID_MAP: Record<string, string> = {
	durationMin: METRIC_DEFINITION_IDS.durationMin,
	totalDistanceM: METRIC_DEFINITION_IDS.totalDistanceM,
	totalDistanceMPerMin: METRIC_DEFINITION_IDS.totalDistanceMPerMin,
	maxSpeedKMH: METRIC_DEFINITION_IDS.maxSpeedKMH,
	highIntensityDistanceM: METRIC_DEFINITION_IDS.highIntensityDistanceM,
	highIntensityRate: METRIC_DEFINITION_IDS.highIntensityRate,
	sprintCount: METRIC_DEFINITION_IDS.sprintCount,
	sprintDistanceM: METRIC_DEFINITION_IDS.sprintDistanceM,
	lowIntensityRate: METRIC_DEFINITION_IDS.lowIntensityRate,
	accelerationCountTotal: METRIC_DEFINITION_IDS.accelerationCountTotal,
	expAccCount: METRIC_DEFINITION_IDS.expAccCount,
	decelerationCountTotal: METRIC_DEFINITION_IDS.decelerationCountTotal,
	expDecCount: METRIC_DEFINITION_IDS.expDecCount,
	noOfHSR: METRIC_DEFINITION_IDS.noOfHSR,
	hsrDistanceM: METRIC_DEFINITION_IDS.hsrDistanceM,
	trainingScoreConsumption: METRIC_DEFINITION_IDS.trainingScoreConsumption,
};
