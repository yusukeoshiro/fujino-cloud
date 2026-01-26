export const METRIC_DEFINITION_IDS = {
	durationMin: 'KkLOxGTCHY2uVOMjLtQE',
	totalDistanceM: 'P6Zu5epLjDOaDQq20Stx',
	totalDistancePerMin: 'I7i8bessV96ciVnFw5IB',
	maxSpeedKMH: 'Q4dPRJ2eqeNR0Bg4DI3E',
	noOfHSR: 'yZ0yLsB60V8NTKrn3Hkw',
	hsrDistanceM: 'Lnznq7uAwamZD683xQ5b',
	highIntensityM: 'Kn39OEkrpQCMQAtMQb5J',
	highIntensityRate: 'RObqK0yOMf4NXhiWig6p',
	noOfSprint: 'ZfqkRYcNfvwYioquCx5h',
	sprintDistanceM: 'mVykVPzBokSZ0l4C7YhJ',
	lowIntensityM: '0xbH1n71xspfVRddG92Q',
	noOfExpAcc: 'XLp9zGyDi0PgkNHn61ln',
	noOfExpDec: 'vMV5RRPagpuPxkoU8F2T',
	accelerationCountTotal: 'XYpyu5CZTDZmMY9DbfNG',
	decelerationCountTotal: 'D7aoPeenTMYu3CxfR6v7',
	lowIntensityRate: 'oOQMjHICxmf3nLwvDitk',
	trainingScoreConsumption: 'b3DroV7arY2KLRUJpdtq',
} as const;

export type MetricDefinitionId = (typeof METRIC_DEFINITION_IDS)[keyof typeof METRIC_DEFINITION_IDS];

export const TRAINING_BASELINE_METRICS = {
	totalDistanceM: METRIC_DEFINITION_IDS.totalDistanceM,
	highIntensityM: METRIC_DEFINITION_IDS.highIntensityM,
	accelerationCountTotal: METRIC_DEFINITION_IDS.accelerationCountTotal,
	decelerationCountTotal: METRIC_DEFINITION_IDS.decelerationCountTotal,
} as const;
