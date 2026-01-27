export const METRIC_DEFINITION_IDS = {
	durationMin: 'KkLOxGTCHY2uVOMjLtQE',
	totalDistanceM: 'P6Zu5epLjDOaDQq20Stx',
	totalDistanceMPerMin: 'I7i8bessV96ciVnFw5IB',
	maxSpeedKMH: 'Q4dPRJ2eqeNR0Bg4DI3E',
	noOfHSR: 'yZ0yLsB60V8NTKrn3Hkw',
	hsrDistanceM: 'Lnznq7uAwamZD683xQ5b',
	highIntensityDistanceM: 'Kn39OEkrpQCMQAtMQb5J',
	highIntensityRate: 'RObqK0yOMf4NXhiWig6p',
	sprintCount: 'ZfqkRYcNfvwYioquCx5h',
	sprintDistanceM: 'mVykVPzBokSZ0l4C7YhJ',
	lowIntensityDistanceM: '0xbH1n71xspfVRddG92Q',
	expAccCount: 'XLp9zGyDi0PgkNHn61ln',
	expDecCount: 'vMV5RRPagpuPxkoU8F2T',
	accelerationCountTotal: 'XYpyu5CZTDZmMY9DbfNG',
	decelerationCountTotal: 'D7aoPeenTMYu3CxfR6v7',
	lowIntensityRate: 'oOQMjHICxmf3nLwvDitk',
	workloadConsumptionPoints: 'b3DroV7arY2KLRUJpdtq',
} as const;

export type MetricDefinitionId = (typeof METRIC_DEFINITION_IDS)[keyof typeof METRIC_DEFINITION_IDS];

export const TRAINING_BASELINE_METRICS = {
	totalDistanceM: METRIC_DEFINITION_IDS.totalDistanceM,
	highIntensityDistanceM: METRIC_DEFINITION_IDS.highIntensityDistanceM,
	accelerationCountTotal: METRIC_DEFINITION_IDS.accelerationCountTotal,
	decelerationCountTotal: METRIC_DEFINITION_IDS.decelerationCountTotal,
} as const;
