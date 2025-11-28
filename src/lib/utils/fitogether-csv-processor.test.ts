import { describe, it, expect, vi } from 'vitest';
import {
	coerce,
	normalizeIdentifier,
	normalizeName,
	FitogetherCsvProcessor,
	type FitogetherCsvProcessorOptions,
	type FitogetherPersonRecord,
} from './fitogether-csv-processor';
import { DateTime } from 'luxon';

describe('FitogetherCsvProcessor Utils', () => {
	describe('coerce', () => {
		it('should return number for numeric string', () => {
			expect(coerce('123')).toBe(123);
			expect(coerce('12.34')).toBe(12.34);
			expect(coerce('-5')).toBe(-5);
		});

		it('should handle comma separated numbers', () => {
			expect(coerce('1,000')).toBe(1000);
			expect(coerce('1,234.56')).toBe(1234.56);
		});

		it('should return string for non-numeric values', () => {
			expect(coerce('abc')).toBe('abc');
			expect(coerce('12a')).toBe('12a');
			expect(coerce('')).toBe('');
		});
	});

	describe('normalizeIdentifier', () => {
		it('should normalize numeric strings', () => {
			expect(normalizeIdentifier('0123')).toBe('123');
			expect(normalizeIdentifier(123)).toBe('123');
		});

		it('should return empty string for null/undefined', () => {
			expect(normalizeIdentifier(null)).toBe('');
			expect(normalizeIdentifier(undefined)).toBe('');
		});

		it('should return original string if not purely numeric', () => {
			expect(normalizeIdentifier('A123')).toBe('A123');
		});
	});

	describe('normalizeName', () => {
		it('should lower case and trim', () => {
			expect(normalizeName('  John Doe  ')).toBe('john doe');
		});

		it('should return empty string for null/undefined', () => {
			expect(normalizeName(null)).toBe('');
			expect(normalizeName(undefined)).toBe('');
		});
	});
});

describe('FitogetherCsvProcessor', () => {
	const mockPersons: FitogetherPersonRecord[] = [
		{ id: 'p1', fullName: 'John Doe', externalId: '10' },
		{ id: 'p2', fullName: 'Jane Smith', externalId: '20' },
	];

	const defaultOptions: FitogetherCsvProcessorOptions = {
		rawRecords: [],
		originalHeaders: [
			'Player Name',
			'Jersey No.',
			'Date',
			'Start Time',
			'End Time',
			'Duration (min)',
			'Total Distance (m)',
		],
		persons: mockPersons,
	};

	it('should match person by Jersey No', () => {
		const options: FitogetherCsvProcessorOptions = {
			...defaultOptions,
			rawRecords: [
				{
					'Player Name': 'Unknown',
					'Jersey No.': '10',
					Date: '2023/10/27',
					'Start Time': '2023/10/27 10:00',
					'End Time': '2023/10/27 11:00',
					'Duration (min)': '60',
					'Total Distance (m)': '5000',
				},
			],
		};
		const processor = new FitogetherCsvProcessor(options);
		const result = processor.process({ trainingBaseline: undefined });

		expect(result.entries).toHaveLength(1);
		expect(result.entries[0].matchedPerson?.id).toBe('p1');
		expect(result.unmatched).toHaveLength(0);
	});

	it('should match person by Name if Jersey No missing', () => {
		const options: FitogetherCsvProcessorOptions = {
			...defaultOptions,
			rawRecords: [
				{
					'Player Name': 'Jane Smith',
					'Jersey No.': '99', // Unknown jersey
					Date: '2023/10/27',
					'Start Time': '2023/10/27 10:00',
					'End Time': '2023/10/27 11:00',
					'Duration (min)': '60',
					'Total Distance (m)': '5000',
				},
			],
		};
		const processor = new FitogetherCsvProcessor(options);
		const result = processor.process({ trainingBaseline: undefined });

		expect(result.entries).toHaveLength(1);
		expect(result.entries[0].matchedPerson?.id).toBe('p2');
	});

	it('should report unmatched person', () => {
		const options: FitogetherCsvProcessorOptions = {
			...defaultOptions,
			rawRecords: [
				{
					'Player Name': 'Stranger',
					'Jersey No.': '999',
					Date: '2023/10/27',
					'Start Time': '2023/10/27 10:00',
					'End Time': '2023/10/27 11:00',
					'Duration (min)': '60',
					'Total Distance (m)': '5000',
				},
			],
		};
		const processor = new FitogetherCsvProcessor(options);
		const result = processor.process({ trainingBaseline: undefined });

		expect(result.entries).toHaveLength(0);
		expect(result.unmatched).toHaveLength(1);
		expect(result.unmatched[0].playerName).toBe('Stranger');
	});

	it('should ignore "Team Average" row', () => {
		const options: FitogetherCsvProcessorOptions = {
			...defaultOptions,
			rawRecords: [
				{
					'Player Name': 'Team Average',
					'Jersey No.': '',
					Date: '2023/10/27',
					'Start Time': '2023/10/27 10:00',
					'End Time': '2023/10/27 11:00',
					'Duration (min)': '60',
					'Total Distance (m)': '5000',
				},
			],
		};
		const processor = new FitogetherCsvProcessor(options);
		const result = processor.process({ trainingBaseline: undefined });

		expect(result.entries).toHaveLength(0);
		expect(result.unmatched).toHaveLength(0);
	});
});
