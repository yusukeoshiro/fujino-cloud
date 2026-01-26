export type SessionType = 'TRAINING' | 'GAME';

export interface SessionMeta {
	type: SessionType;
	date: string;
	startTime?: Date;
	endTime?: Date;
	fullName: string;
	birthday: string;
}

export interface GpsCore {
	durationMin: number;
	totalDistanceM: number;
	totalDistanceMPerMin: number;
	maxSpeedKMH: number;

	noOfHSR: number;
	HSRDistanceM: number;

	noOfSprint: number;
	sprintDistanceM: number;
	speedZone1DistanceM: number;
	speedZone3DistanceM: number;
	speedZone4DistanceM: number;
	speedZone5DistanceM: number;
	speedZone6DistanceM: number;
	speedZone7DistanceM: number;
	speedZone8DistanceM: number;
	speedZone9DistanceM: number;

	accelerationZone4EntryCount: number;
	accelerationZone5EntryCount: number;
	accelerationZone6EntryCount: number;

	decelerationZone4EntryCount: number;
	decelerationZone5EntryCount: number;
	decelerationZone6EntryCount: number;

	noOfExpAcc: number;
	noOfExpDec: number;
}

export interface DerivedMetrics {
	highIntensityM: number;
	highIntensityRate: number;
	lowIntensityRate: number;
	accelerationCountTotal: number;
	decelerationCountTotal: number;
}

export function computeDerived(core: GpsCore): DerivedMetrics {
	const highIntensityM = core.speedZone8DistanceM + core.speedZone9DistanceM;

	return {
		highIntensityM,
		highIntensityRate: highIntensityM / core.totalDistanceM,
		lowIntensityRate: core.speedZone1DistanceM / core.totalDistanceM,
		accelerationCountTotal: core.accelerationZone5EntryCount + core.accelerationZone6EntryCount,
		decelerationCountTotal: core.decelerationZone5EntryCount + core.decelerationZone6EntryCount,
	};
}
