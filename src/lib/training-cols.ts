import { METRIC_DEFINITION_IDS } from '$lib/constants/metric-definition-ids';

export const trainigMetricDefinitionIds = [
	METRIC_DEFINITION_IDS.durationMin,
	METRIC_DEFINITION_IDS.totalDistanceM,
	METRIC_DEFINITION_IDS.totalDistancePerMin,
	METRIC_DEFINITION_IDS.maxSpeedKMH,
	METRIC_DEFINITION_IDS.highIntensityM,
	METRIC_DEFINITION_IDS.highIntensityRate,
	METRIC_DEFINITION_IDS.noOfSprint,
	METRIC_DEFINITION_IDS.sprintDistanceM,
	METRIC_DEFINITION_IDS.lowIntensityRate,
	METRIC_DEFINITION_IDS.accelerationCountTotal,
	METRIC_DEFINITION_IDS.noOfExpAcc,
	METRIC_DEFINITION_IDS.decelerationCountTotal,
	METRIC_DEFINITION_IDS.noOfExpDec,
	METRIC_DEFINITION_IDS.noOfHSR,
	METRIC_DEFINITION_IDS.hsrDistanceM,
	METRIC_DEFINITION_IDS.trainingScoreConsumption,
];

export const FIELD_ID_MAP: Record<string, string> = {
	durationMin: METRIC_DEFINITION_IDS.durationMin,
	totalDistanceM: METRIC_DEFINITION_IDS.totalDistanceM,
	totalDistanceMPerMin: METRIC_DEFINITION_IDS.totalDistancePerMin,
	maxSpeedKMH: METRIC_DEFINITION_IDS.maxSpeedKMH,
	highIntensityM: METRIC_DEFINITION_IDS.highIntensityM,
	highIntensityRate: METRIC_DEFINITION_IDS.highIntensityRate,
	noOfSprint: METRIC_DEFINITION_IDS.noOfSprint,
	sprintDistanceM: METRIC_DEFINITION_IDS.sprintDistanceM,
	lowIntensityRate: METRIC_DEFINITION_IDS.lowIntensityRate,
	accelerationCountTotal: METRIC_DEFINITION_IDS.accelerationCountTotal,
	noOfExpAcc: METRIC_DEFINITION_IDS.noOfExpAcc,
	decelerationCountTotal: METRIC_DEFINITION_IDS.decelerationCountTotal,
	noOfExpDec: METRIC_DEFINITION_IDS.noOfExpDec,
	noOfHSR: METRIC_DEFINITION_IDS.noOfHSR,
	HSRDistanceM: METRIC_DEFINITION_IDS.hsrDistanceM,
	trainingScoreConsumption: METRIC_DEFINITION_IDS.trainingScoreConsumption,
};
