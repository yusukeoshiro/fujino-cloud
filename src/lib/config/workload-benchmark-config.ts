import rawConfig from './workload-benchmark-config.json';

export const WORKLOAD_CONSUMPTION_FIELDS = [
	'totalDistanceM',
	'highIntensityDistanceM',
	'accelerationCountTotal',
	'decelerationCountTotal',
] as const;

export type WorkloadConsumptionField = (typeof WORKLOAD_CONSUMPTION_FIELDS)[number];

export type WorkloadConsumptionWeights = Record<WorkloadConsumptionField, number>;

export type WorkloadBenchmarkConfig = Record<string, Partial<WorkloadConsumptionWeights>>;

const DEFAULT_WEIGHTS: WorkloadConsumptionWeights = {
	totalDistanceM: 1,
	highIntensityDistanceM: 1,
	accelerationCountTotal: 1,
	decelerationCountTotal: 1,
};

const config = rawConfig as WorkloadBenchmarkConfig;

export function resolveWorkloadConsumptionWeights(orgId?: string): WorkloadConsumptionWeights {
	const overrides = orgId ? config[orgId] : undefined;
	if (!overrides) return { ...DEFAULT_WEIGHTS };

	const weights = { ...DEFAULT_WEIGHTS };
	for (const field of WORKLOAD_CONSUMPTION_FIELDS) {
		const override = overrides[field];
		if (typeof override === 'number' && Number.isFinite(override)) {
			weights[field] = override;
		}
	}

	return weights;
}
