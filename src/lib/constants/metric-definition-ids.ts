export const METRIC_DEFINITION_IDS = {
	durationMin: 'KkLOxGTCHY2uVOMjLtQE',
	totalDistanceM: 'P6Zu5epLjDOaDQq20Stx',
	totalDistancePerMin: 'I7i8bessV96ciVnFw5IB',
	maxSpeedKMH: 'Q4dPRJ2eqeNR0Bg4DI3E',
	highIntensityM: 'Kn39OEkrpQCMQAtMQb5J',
	highIntensityRate: 'RObqK0yOMf4NXhiWig6p',
	noOfSprint: 'ZfqkRYcNfvwYioquCx5h',
	sprintDistanceM: 'mVykVPzBokSZ0l4C7YhJ',
	speedZone1DistanceM: '0xbH1n71xspfVRddG92Q',
	speedZone3DistanceM: 'j6u2oo2CjbSngFLioS2Q',
	speedZone4DistanceM: 'oKXeSMbv7zfV7WjTV4Wp',
	speedZone5DistanceM: 'nulFBwmrHVrA20HPtNrp',
	accelerationZone4EntryCount: '4Pf9FuE2agjFASX1acXF',
	accelerationZone5EntryCount: 'kCZxKxfA9MfWVgBmdTbo',
	accelerationZone6EntryCount: 'YR3ZEOZLTLwJk23XKVpj',
	decelerationZone4EntryCount: 'FSmTTs8BG3fq608Zcy4F',
	decelerationZone5EntryCount: 'g60b48TuNLrtstb0dy65',
	decelerationZone6EntryCount: 'mPoLSRIgbc1IwC3fPsP9',
	noOfExpAcc: 'XLp9zGyDi0PgkNHn61ln',
	noOfExpDec: 'vMV5RRPagpuPxkoU8F2T',
	accelerationCountTotal: 'XYpyu5CZTDZmMY9DbfNG',
	decelerationCountTotal: 'D7aoPeenTMYu3CxfR6v7',
	walkingRate: 'oOQMjHICxmf3nLwvDitk',
	trainingScoreConsumption: 'b3DroV7arY2KLRUJpdtq',
} as const;

export type MetricDefinitionId = (typeof METRIC_DEFINITION_IDS)[keyof typeof METRIC_DEFINITION_IDS];

export const TRAINING_BASELINE_METRICS = {
	totalDistanceM: METRIC_DEFINITION_IDS.totalDistanceM,
	highIntensityM: METRIC_DEFINITION_IDS.highIntensityM,
	accelerationCountTotal: METRIC_DEFINITION_IDS.accelerationCountTotal,
	decelerationCountTotal: METRIC_DEFINITION_IDS.decelerationCountTotal,
} as const;
