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
	hsrDistanceM: number;

	sprintCount: number;
	sprintDistanceM: number;
	highIntensityDistanceM: number;
	lowIntensityDistanceM: number;

	accelerationCountTotal: number;
	decelerationCountTotal: number;

	expAccCount: number;
	expDecCount: number;
}

export interface DerivedMetrics {
	highIntensityRate: number;
	lowIntensityRate: number;
}
