import { METRIC_DEFINITION_IDS } from '$lib/constants/metric-definition-ids';
import type { PlayerGpsSession } from './player-gps-session';

export type MetricValueRecord = Record<string, number | null>;

export function buildMetricValues(parser: PlayerGpsSession): MetricValueRecord {
	return {
		[METRIC_DEFINITION_IDS.durationMin]: parser.durationMin,
		[METRIC_DEFINITION_IDS.totalDistanceM]: parser.totalDistanceM,
		[METRIC_DEFINITION_IDS.totalDistanceMPerMin]: parser.totalDistanceMPerMin,
		[METRIC_DEFINITION_IDS.maxSpeedKMH]: parser.maxSpeedKMH,
		[METRIC_DEFINITION_IDS.noOfHSR]: parser.noOfHSR,
		[METRIC_DEFINITION_IDS.hsrDistanceM]: parser.hsrDistanceM,
		[METRIC_DEFINITION_IDS.sprintCount]: parser.sprintCount,
		[METRIC_DEFINITION_IDS.sprintDistanceM]: parser.sprintDistanceM,
		[METRIC_DEFINITION_IDS.highIntensityDistanceM]: parser.highIntensityDistanceM,
		[METRIC_DEFINITION_IDS.highIntensityRate]: parser.highIntensityRate,
		[METRIC_DEFINITION_IDS.lowIntensityDistanceM]: parser.lowIntensityDistanceM,
		[METRIC_DEFINITION_IDS.lowIntensityRate]: parser.lowIntensityRate,
		[METRIC_DEFINITION_IDS.accelerationCountTotal]: parser.accelerationCountTotal,
		[METRIC_DEFINITION_IDS.expAccCount]: parser.expAccCount,
		[METRIC_DEFINITION_IDS.decelerationCountTotal]: parser.decelerationCountTotal,
		[METRIC_DEFINITION_IDS.expDecCount]: parser.expDecCount,
		[METRIC_DEFINITION_IDS.workloadConsumptionPoints]: parser.workloadConsumptionPoints,
	};
}
