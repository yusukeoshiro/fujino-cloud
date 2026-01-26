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
	// Optional (nullable) metrics in the intermediate schema.
	durationMin: number | null;
	totalDistanceM: number;
	totalDistanceMPerMin: number | null;
	maxSpeedKMH: number | null;

	noOfHSR: number | null;
	hsrDistanceM: number | null;

	sprintCount: number | null;
	sprintDistanceM: number | null;
	highIntensityDistanceM: number;
	lowIntensityDistanceM: number | null;

	accelerationCountTotal: number;
	decelerationCountTotal: number;

	expAccCount: number | null;
	expDecCount: number | null;
}

export interface DerivedMetrics {
	highIntensityRate: number | null;
	lowIntensityRate: number | null;
}
