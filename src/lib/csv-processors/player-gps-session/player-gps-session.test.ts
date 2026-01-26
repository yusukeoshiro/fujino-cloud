import { describe, it, expect } from 'vitest';
import { PlayerGpsSession } from './player-gps-session';
import type { GpsCore, SessionMeta } from './gps-core.model';

describe('PlayerGpsSession', () => {
	const mockData: GpsCore & SessionMeta = {
		type: 'TRAINING',
		date: '2023-10-27',
		startTime: new Date('2023-10-27T10:00:00Z'),
		endTime: new Date('2023-10-27T11:30:00Z'),
		fullName: 'Test Player',
		birthday: '2000-01-01',

		durationMin: 90,
		totalDistanceM: 10000,
		totalDistanceMPerMin: 111.11,
		maxSpeedKMH: 30.5,

		noOfHSR: 10,
		hsrDistanceM: 500,

		sprintCount: 5,
		sprintDistanceM: 200,
		highIntensityDistanceM: 200,
		lowIntensityDistanceM: 4000,
		accelerationCountTotal: 4,
		decelerationCountTotal: 6,

		expAccCount: 2,
		expDecCount: 3,
	};

	it('should initialize correctly', () => {
		const parser = new PlayerGpsSession(mockData);

		expect(parser.fullName).toBe('Test Player');
		expect(parser.totalDistanceM).toBe(10000);
		expect(parser.type).toBe('TRAINING');
	});

	it('should calculate highIntensityDistanceM correctly', () => {
		const parser = new PlayerGpsSession(mockData);
		expect(parser.highIntensityDistanceM).toBe(200);
	});

	it('should calculate highIntensityRate correctly', () => {
		// 200 / 10000 = 0.02
		const parser = new PlayerGpsSession(mockData);
		expect(parser.highIntensityRate).toBe(0.02);
	});

	it('should calculate lowIntensityRate correctly', () => {
		const parser = new PlayerGpsSession(mockData);
		expect(parser.lowIntensityRate).toBe(0.4);
	});

	it('should calculate accelerationCountTotal correctly', () => {
		const parser = new PlayerGpsSession(mockData);
		expect(parser.accelerationCountTotal).toBe(4);
	});

	it('should calculate decelerationCountTotal correctly', () => {
		const parser = new PlayerGpsSession(mockData);
		expect(parser.decelerationCountTotal).toBe(6);
	});

	describe('workloadConsumptionPoints', () => {
		it('should return null if no baseline provided', () => {
			const parser = new PlayerGpsSession(mockData);
			expect(parser.workloadConsumptionPoints).toBeNull();
		});

		it('should calculate score correctly with valid baseline', () => {
			const baseline = {
				totalDistanceM: 10000, // 100%
				highIntensityDistanceM: 200, // 100%
				accelerationCountTotal: 4, // 100%
				decelerationCountTotal: 6, // 100%
			};
			const parser = new PlayerGpsSession(mockData, baseline);

			// (1 + 1 + 1 + 1) / 4 * 100 = 100
			expect(parser.workloadConsumptionPoints).toBe(100);
		});

		it('should calculate score correctly with mixed baseline', () => {
			const baseline = {
				totalDistanceM: 20000, // parser is 50%
				highIntensityDistanceM: 400, // parser is 50%
				accelerationCountTotal: 8, // parser is 50%
				decelerationCountTotal: 12, // parser is 50%
			};
			const parser = new PlayerGpsSession(mockData, baseline);

			// (0.5 + 0.5 + 0.5 + 0.5) / 4 * 100 = 50
			expect(parser.workloadConsumptionPoints).toBe(50);
		});

		it('should handle zero in baseline (return null to avoid division by zero)', () => {
			const baseline = {
				totalDistanceM: 0,
				highIntensityDistanceM: 200,
				accelerationCountTotal: 4,
				decelerationCountTotal: 6,
			};
			const parser = new PlayerGpsSession(mockData, baseline);
			expect(parser.workloadConsumptionPoints).toBeNull();
		});
	});

	it('should generate toJson object correctly', () => {
		const parser = new PlayerGpsSession(mockData);
		const json = parser.toJson();

		expect(json['氏名']).toBe('Test Player');
		expect(json['総走行距離(m)']).toBe(10000);
		expect(json['高強度距離(m)']).toBe(200);
		expect(json['ワークロード消費ポイント']).toBeNull();
	});
});
