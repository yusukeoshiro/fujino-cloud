import { describe, it, expect } from 'vitest';
import { PlayerGpsSession } from './player-gps-session';
import type { GpsCore, SessionMeta } from '../../gps-core.model';

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
		HSRDistanceM: 500,

		noOfSprint: 5,
		sprintDistanceM: 200,
		speedZone1DistanceM: 4000,
		speedZone3DistanceM: 1000,
		speedZone4DistanceM: 500,
		speedZone5DistanceM: 200,

		accelerationZone4EntryCount: 5,
		accelerationZone5EntryCount: 3,
		accelerationZone6EntryCount: 1,

		decelerationZone4EntryCount: 6,
		decelerationZone5EntryCount: 4,
		decelerationZone6EntryCount: 2,

		noOfExpAcc: 2,
		noOfExpDec: 3,
	};

	it('should initialize correctly', () => {
		const parser = new PlayerGpsSession(mockData);

		expect(parser.fullName).toBe('Test Player');
		expect(parser.totalDistanceM).toBe(10000);
		expect(parser.type).toBe('TRAINING');
	});

	it('should calculate highIntensityM correctly', () => {
		// Z5 + Z4 + Z3 = 200 + 500 + 1000 = 1700
		const parser = new PlayerGpsSession(mockData);
		expect(parser.highIntensityM).toBe(1700);
	});

	it('should calculate highIntensityRate correctly', () => {
		// 1700 / 10000 = 0.17
		const parser = new PlayerGpsSession(mockData);
		expect(parser.highIntensityRate).toBe(0.17);
	});

	it('should calculate walkingRate correctly', () => {
		// Z1 / total = 4000 / 10000 = 0.4
		const parser = new PlayerGpsSession(mockData);
		expect(parser.walkingRate).toBe(0.4);
	});

	it('should calculate accelerationCountTotal correctly', () => {
		// Acc Z5 + Z6 = 3 + 1 = 4
		const parser = new PlayerGpsSession(mockData);
		expect(parser.accelerationCountTotal).toBe(4);
	});

	it('should calculate decelerationCountTotal correctly', () => {
		// Dec Z5 + Z6 = 4 + 2 = 6
		const parser = new PlayerGpsSession(mockData);
		expect(parser.decelerationCountTotal).toBe(6);
	});

	describe('trainingScoreConsumption', () => {
		it('should return null if no baseline provided', () => {
			const parser = new PlayerGpsSession(mockData);
			expect(parser.trainingScoreConsumption).toBeNull();
		});

		it('should calculate score correctly with valid baseline', () => {
			const baseline = {
				totalDistanceM: 10000, // 100%
				highIntensityM: 1700, // 100%
				accelerationCountTotal: 4, // 100%
				decelerationCountTotal: 6, // 100%
			};
			const parser = new PlayerGpsSession(mockData, baseline);

			// (1 + 1 + 1 + 1) / 4 * 100 = 100
			expect(parser.trainingScoreConsumption).toBe(100);
		});

		it('should calculate score correctly with mixed baseline', () => {
			const baseline = {
				totalDistanceM: 20000, // parser is 50%
				highIntensityM: 3400, // parser is 50%
				accelerationCountTotal: 8, // parser is 50%
				decelerationCountTotal: 12, // parser is 50%
			};
			const parser = new PlayerGpsSession(mockData, baseline);

			// (0.5 + 0.5 + 0.5 + 0.5) / 4 * 100 = 50
			expect(parser.trainingScoreConsumption).toBe(50);
		});

		it('should handle zero in baseline (return null to avoid division by zero)', () => {
			const baseline = {
				totalDistanceM: 0,
				highIntensityM: 1700,
				accelerationCountTotal: 4,
				decelerationCountTotal: 6,
			};
			const parser = new PlayerGpsSession(mockData, baseline);
			expect(parser.trainingScoreConsumption).toBeNull();
		});
	});

	it('should generate toJson object correctly', () => {
		const parser = new PlayerGpsSession(mockData);
		const json = parser.toJson();

		expect(json['氏名']).toBe('Test Player');
		expect(json['総走行距離(m)']).toBe(10000);
		expect(json['高強度距離(m)']).toBe(1700);
		expect(json['トレーニングスコア消費']).toBeNull();
	});
});
