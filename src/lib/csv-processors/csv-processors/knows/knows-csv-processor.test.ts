import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import {
	KnowsCsvProcessor,
	type KnowsPersonRecord,
} from '$lib/csv-processors/csv-processors/knows/knows-csv-processor';

const parseCsvText = (text: string) => {
	const rawRecords = parse(text, {
		columns: (headers: string[]) => headers.map((header) => header.trim()),
		skip_empty_lines: true,
		bom: true,
		delimiter: [',', '\t'],
		relax_column_count: true,
	}) as Array<Record<string, string>>;

	const originalHeaders =
		rawRecords.length > 0
			? Object.keys(rawRecords[0])
			: (text
					.split(/\r?\n/)[0]
					?.split(',')
					.map((h) => h.trim()) ?? []);

	return { rawRecords, originalHeaders };
};

describe('KnowsCsvProcessor', () => {
	it('aggregates multiple rows with the same User_ID', () => {
		const csvPath = path.resolve(process.cwd(), 'test-assets/knows-tm-sample.csv');
		const text = fs.readFileSync(csvPath, 'utf8');
		const { rawRecords, originalHeaders } = parseCsvText(text);

		const targetUserId = '74168';
		const filteredRecords = rawRecords.filter((row) => String(row['User_ID']) === targetUserId);

		const persons: KnowsPersonRecord[] = [
			{ id: 'p1', fullName: 'Player 01 Registered', externalId: targetUserId },
		];

		const processor = new KnowsCsvProcessor({
			rawRecords: filteredRecords,
			originalHeaders,
			persons,
			sessionDate: '2024-01-01',
		});
		const result = processor.process({ trainingBaseline: undefined });

		expect(result.unmatched).toHaveLength(0);
		expect(result.entries).toHaveLength(1);

		const entry = result.entries[0];
		expect(entry.rowIndices).toEqual([2, 3]);
		expect(entry.resolvedFullName).toBe('Player 01 Registered');

		const parser = result.parsers[0];
		expect(parser.fullName).toBe('Player 01 Registered');
		expect(parser.durationMin).toBe(97);
		expect(parser.totalDistanceM).toBeCloseTo(13463.689, 3);
		expect(parser.maxSpeedKMH).toBeCloseTo(28.6, 5);
		expect(parser.lowIntensityDistanceM).toBeCloseTo(2850.53, 2);
		expect(parser.highIntensityDistanceM).toBeCloseTo(1055.44, 2);
		expect(parser.sprintCount).toBe(14);
		expect(parser.accelerationCountTotal).toBe(130);
		expect(parser.decelerationCountTotal).toBe(136);
	});
});
