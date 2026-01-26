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
	hsrDistanceM: number;

	sprintCount: number;
	sprintDistanceM: number;
	highIntensityDistanceM: number;
	lowIntensityDistanceM: number;

	accelerationCountTotal: number;
	decelerationCountTotal: number;

	expAccCount: number;
	expDecCount: number;

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
		this.hsrDistanceM = params.hsrDistanceM;

		this.sprintCount = params.sprintCount;
		this.sprintDistanceM = params.sprintDistanceM;
		this.highIntensityDistanceM = params.highIntensityDistanceM;
		this.lowIntensityDistanceM = params.lowIntensityDistanceM;

		this.accelerationCountTotal = params.accelerationCountTotal;
		this.decelerationCountTotal = params.decelerationCountTotal;

		this.expAccCount = params.expAccCount;
		this.expDecCount = params.expDecCount;
	}

	// computed, from raw:
	get highIntensityRate() {
		// Derived: high-intensity distance as a share of total distance.
		return this.highIntensityDistanceM / this.totalDistanceM;
	}
	get lowIntensityRate() {
		// Derived: low-intensity (Z1) share of total distance.
		return this.lowIntensityDistanceM / this.totalDistanceM;
	}

	get workloadConsumptionPoints(): number | null {
		// Derived: average of four ratios vs baseline (total distance, high intensity, accel, decel) * 100, rounded.
		// Returns null if baseline is missing/invalid to avoid divide-by-zero or NaN.
		const baseline = this.trainingBaseline;
		if (!baseline) return null;
		const {
			totalDistanceM,
			highIntensityDistanceM,
			accelerationCountTotal,
			decelerationCountTotal,
		} = baseline;

		if (
			!isFinite(totalDistanceM) ||
			totalDistanceM <= 0 ||
			!isFinite(highIntensityDistanceM) ||
			highIntensityDistanceM <= 0 ||
			!isFinite(accelerationCountTotal) ||
			accelerationCountTotal <= 0 ||
			!isFinite(decelerationCountTotal) ||
			decelerationCountTotal <= 0
		) {
			return null;
		}

		const workloadConsumptionPoints = Math.round(
			((this.totalDistanceM / totalDistanceM +
				this.highIntensityDistanceM / highIntensityDistanceM +
				this.accelerationCountTotal / accelerationCountTotal +
				this.decelerationCountTotal / decelerationCountTotal) /
				4) *
				100,
		);

		// console.log('----------------');
		// console.log(`${this.fullName}`);
		// console.log(`${this.totalDistanceM} / ${totalDistanceM}`);
		// console.log(`${this.highIntensityDistanceM} / ${highIntensityDistanceM}`);
		// console.log(`${this.accelerationCountTotal} / ${accelerationCountTotal}`);
		// console.log(`${this.decelerationCountTotal} / ${decelerationCountTotal}`);
		// console.log({ workloadConsumptionPoints });

		return workloadConsumptionPoints;
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
			'HSR距離(m)': this.hsrDistanceM,

			スプリント回数: this.sprintCount,
			'スプリント距離(m)': this.sprintDistanceM,

			'高強度距離(m)': this.highIntensityDistanceM,
			'低強度距離(m)': this.lowIntensityDistanceM,
			高強度割合: this.highIntensityRate,
			ウォーキング割合: this.lowIntensityRate,
			加速合計回数: this.accelerationCountTotal,
			減速合計回数: this.decelerationCountTotal,
			爆発的加速回数: this.expAccCount,
			爆発的減速回数: this.expDecCount,

			ワークロード消費ポイント: this.workloadConsumptionPoints,
		} as const;

		return base;
		// if (!this.gamePointParser)

		// return {
		// 	...base,
		// 	// Baseline (GamePoint) if available
		// 	'ベースライン_総距離(m)': this.gamePointParser.totalDistanceM,
		// 	'ベースライン_高強度距離(m)': this.gamePointParser.highIntensityDistanceM,
		// 	ベースライン_加速合計: this.gamePointParser.accelerationCountTotal,
		// 	ベースライン_減速合計: this.gamePointParser.decelerationCountTotal,
		// };
	}
}

type TrainingBaseline = {
	totalDistanceM: number;
	highIntensityDistanceM: number;
	accelerationCountTotal: number;
	decelerationCountTotal: number;
};
