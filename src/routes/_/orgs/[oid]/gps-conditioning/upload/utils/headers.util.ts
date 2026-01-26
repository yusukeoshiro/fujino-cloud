import { METRIC_DEFINITION_IDS } from '$lib/constants/metric-definition-ids';

export const HEADER_COLS: string[] = ['fullName'];

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
	METRIC_DEFINITION_IDS.lowIntensityDistanceM,
	METRIC_DEFINITION_IDS.lowIntensityRate,
	METRIC_DEFINITION_IDS.accelerationCountTotal,
	METRIC_DEFINITION_IDS.expAccCount,
	METRIC_DEFINITION_IDS.decelerationCountTotal,
	METRIC_DEFINITION_IDS.expDecCount,
	METRIC_DEFINITION_IDS.workloadConsumptionPoints,
];
