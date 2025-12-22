import type { GpsCore, SessionMeta, SessionType } from './gps-core.model';

// PlayerGpsSession models a single player's GPS session row and exposes derived metrics and score calculations.
export class PlayerGpsSession implements GpsCore, SessionMeta {
	// raw fields (same as before)
	type: SessionType;
	date: string;
	startTime?: Date;
	endTime?: Date;

	fullName: string;
	birthday: string;

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

	trainingBaseline?: TrainingBaseline;

	orgUniqueToken?: string;

	constructor(params: GpsCore & SessionMeta, trainingBaseline?: TrainingBaseline) {
		this.trainingBaseline = trainingBaseline;

		// explicit assignment to satisfy strictPropertyInitialization
		this.type = params.type;
		this.date = params.date;
		this.startTime = params.startTime;
		this.endTime = params.endTime;

		this.fullName = params.fullName;
		this.birthday = params.birthday;

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
	}

	// computed, from raw:
	get highIntensityM() {
		// Derived: distance covered in speed zones Z3–Z5.
		return this.speedZone5DistanceM + this.speedZone4DistanceM + this.speedZone3DistanceM;
	}
	get highIntensityRate() {
		// Derived: high-intensity distance as a share of total distance.
		return this.highIntensityM / this.totalDistanceM;
	}
	get walkingRate() {
		// Derived: low-intensity (Z1) share of total distance.
		return this.speedZone1DistanceM / this.totalDistanceM;
	}
	get accelerationCountTotal() {
		// Derived: higher acceleration zone counts used in scoring.
		return this.accelerationZone5EntryCount + this.accelerationZone6EntryCount;
	}
	get decelerationCountTotal() {
		// Derived: higher deceleration zone counts used in scoring.
		return this.decelerationZone5EntryCount + this.decelerationZone6EntryCount;
	}

	get trainingScoreConsumption(): number | null {
		// Derived: average of four ratios vs baseline (total distance, high intensity, accel, decel) * 100, rounded.
		// Returns null if baseline is missing/invalid to avoid divide-by-zero or NaN.
		const baseline = this.trainingBaseline;
		if (!baseline) return null;
		const { totalDistanceM, highIntensityM, accelerationCountTotal, decelerationCountTotal } =
			baseline;

		if (
			!isFinite(totalDistanceM) ||
			totalDistanceM <= 0 ||
			!isFinite(highIntensityM) ||
			highIntensityM <= 0 ||
			!isFinite(accelerationCountTotal) ||
			accelerationCountTotal <= 0 ||
			!isFinite(decelerationCountTotal) ||
			decelerationCountTotal <= 0
		) {
			return null;
		}

		const trainingConsumptionScore = Math.round(
			((this.totalDistanceM / totalDistanceM +
				this.highIntensityM / highIntensityM +
				this.accelerationCountTotal / accelerationCountTotal +
				this.decelerationCountTotal / decelerationCountTotal) /
				4) *
				100,
		);

		return trainingConsumptionScore;
	}

	toJson() {
		// Format the session into a display/export-friendly shape with derived metrics included.
		const iso = (d?: Date) => (d ? d.toISOString() : null);

		const base = {
			タイプ: this.type, // 'TRAINING' | 'GAME'
			日付: this.date, // 'yyyy-MM-dd'
			開始時刻: iso(this.startTime), // ISO string or null
			終了時刻: iso(this.endTime), // ISO string or null

			氏名: this.fullName,
			生年月日: this.birthday,

			'継続時間(分)': this.durationMin,
			'総走行距離(m)': this.totalDistanceM,
			'1分当たり距離(m/min)': this.totalDistanceMPerMin,
			'最高速度(km/h)': this.maxSpeedKMH,

			HSR回数: this.noOfHSR,
			'HSR距離(m)': this.HSRDistanceM,

			スプリント回数: this.noOfSprint,
			'スプリント距離(m)': this.sprintDistanceM,

			'Z1距離(m)': this.speedZone1DistanceM,
			'Z3距離(m)': this.speedZone3DistanceM,
			'Z4距離(m)': this.speedZone4DistanceM,
			'Z5距離(m)': this.speedZone5DistanceM,

			加速Z4回数: this.accelerationZone4EntryCount,
			加速Z5回数: this.accelerationZone5EntryCount,
			加速Z6回数: this.accelerationZone6EntryCount,

			減速Z4回数: this.decelerationZone4EntryCount,
			減速Z5回数: this.decelerationZone5EntryCount,
			減速Z6回数: this.decelerationZone6EntryCount,

			爆発的加速回数: this.noOfExpAcc,
			爆発的減速回数: this.noOfExpDec,

			// Derived
			'高強度距離(m)': this.highIntensityM,
			高強度割合: this.highIntensityRate,
			ウォーキング割合: this.walkingRate,
			加速合計回数: this.accelerationCountTotal,
			減速合計回数: this.decelerationCountTotal,

			トレーニングスコア消費: this.trainingScoreConsumption,
		} as const;

		return base;
		// if (!this.gamePointParser)

		// return {
		// 	...base,
		// 	// Baseline (GamePoint) if available
		// 	'ベースライン_総距離(m)': this.gamePointParser.totalDistanceM,
		// 	'ベースライン_高強度距離(m)': this.gamePointParser.highIntensityM,
		// 	ベースライン_加速合計: this.gamePointParser.accelerationCountTotal,
		// 	ベースライン_減速合計: this.gamePointParser.decelerationCountTotal,
		// };
	}
}

type TrainingBaseline = {
	totalDistanceM: number;
	highIntensityM: number;
	accelerationCountTotal: number;
	decelerationCountTotal: number;
};
