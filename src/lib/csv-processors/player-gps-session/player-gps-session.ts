import {
	resolveWorkloadConsumptionWeights,
	WORKLOAD_CONSUMPTION_FIELDS,
	type WorkloadConsumptionField,
} from '$lib/config/workload-benchmark-config';
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

	trainingBaseline?: TrainingBaseline;

	orgUniqueToken?: string;
	orgId?: string;

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

		this.orgId = params.orgId;
	}

	// computed, from raw:
	get highIntensityRate() {
		// Derived: high-intensity distance as a share of total distance.
		if (!isFiniteNumber(this.totalDistanceM) || this.totalDistanceM <= 0) return null;
		if (!isFiniteNumber(this.highIntensityDistanceM)) return null;
		return this.highIntensityDistanceM / this.totalDistanceM;
	}
	get lowIntensityRate() {
		// Derived: low-intensity (Z1) share of total distance.
		if (!isFiniteNumber(this.totalDistanceM) || this.totalDistanceM <= 0) return null;
		if (!isFiniteNumber(this.lowIntensityDistanceM)) return null;
		return this.lowIntensityDistanceM / this.totalDistanceM;
	}

	get workloadConsumptionPoints(): number | null {
		// Derived: weighted average of ratios vs baseline (total distance, high intensity, accel, decel) * 100.
		// Returns null if baseline is missing/invalid or no weighted fields are enabled.
		const baseline = this.trainingBaseline;
		if (!baseline) return null;

		const weights = resolveWorkloadConsumptionWeights(this.orgId);
		const sessionValues: Record<WorkloadConsumptionField, number> = {
			totalDistanceM: this.totalDistanceM,
			highIntensityDistanceM: this.highIntensityDistanceM,
			accelerationCountTotal: this.accelerationCountTotal,
			decelerationCountTotal: this.decelerationCountTotal,
		};
		let weightedSum = 0;
		let totalWeight = 0;

		for (const field of WORKLOAD_CONSUMPTION_FIELDS) {
			const weight = weights[field];
			if (!isFiniteNumber(weight) || weight <= 0) continue;

			const sessionValue = sessionValues[field];
			const baselineValue = baseline[field];

			if (!isFiniteNumber(sessionValue)) return null;
			if (!isFiniteNumber(baselineValue) || baselineValue <= 0) return null;

			weightedSum += (sessionValue / baselineValue) * weight;
			totalWeight += weight;
		}

		if (totalWeight <= 0) return null;

		const workloadConsumptionPoints = Math.round((weightedSum / totalWeight) * 100);

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
	[field in WorkloadConsumptionField]: number;
};

const isFiniteNumber = (value: unknown): value is number =>
	typeof value === 'number' && Number.isFinite(value);
