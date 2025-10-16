import type { GpsCore, DerivedMetrics } from './gps-core.model';

export class GamePointParser implements GpsCore, DerivedMetrics {
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

	accelerationZone4EntryCount: number;
	accelerationZone5EntryCount: number;
	accelerationZone6EntryCount: number;

	decelerationZone4EntryCount: number;
	decelerationZone5EntryCount: number;
	decelerationZone6EntryCount: number;

	noOfExpAcc: number;
	noOfExpDec: number;

	// independent “points” (not getters)
	highIntensityM: number;
	highIntensityRate: number;
	walkingRate: number;
	accelerationCountTotal: number;
	decelerationCountTotal: number;

	constructor(params: GpsCore & DerivedMetrics) {
		this.durationMin = params.durationMin;
		this.totalDistanceM = params.totalDistanceM;
		this.totalDistanceMPerMin = params.totalDistanceMPerMin;
		this.maxSpeedKMH = params.maxSpeedKMH;

		this.noOfHSR = params.noOfHSR;
		this.HSRDistanceM = params.HSRDistanceM;

		this.noOfSprint = params.noOfSprint;
		this.sprintDistanceM = params.sprintDistanceM;
		this.speedZone1DistanceM = params.speedZone1DistanceM;
		this.speedZone3DistanceM = params.speedZone3DistanceM;
		this.speedZone4DistanceM = params.speedZone4DistanceM;
		this.speedZone5DistanceM = params.speedZone5DistanceM;

		this.accelerationZone4EntryCount = params.accelerationZone4EntryCount;
		this.accelerationZone5EntryCount = params.accelerationZone5EntryCount;
		this.accelerationZone6EntryCount = params.accelerationZone6EntryCount;

		this.decelerationZone4EntryCount = params.decelerationZone4EntryCount;
		this.decelerationZone5EntryCount = params.decelerationZone5EntryCount;
		this.decelerationZone6EntryCount = params.decelerationZone6EntryCount;

		this.noOfExpAcc = params.noOfExpAcc;
		this.noOfExpDec = params.noOfExpDec;

		// independent values
		this.highIntensityM = params.highIntensityM;
		this.highIntensityRate = params.highIntensityRate;
		this.walkingRate = params.walkingRate;
		this.accelerationCountTotal = params.accelerationCountTotal;
		this.decelerationCountTotal = params.decelerationCountTotal;
	}
}
