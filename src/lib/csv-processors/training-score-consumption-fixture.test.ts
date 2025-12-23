import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';
import { FitogetherCsvProcessor } from '$lib/csv-processors/csv-processors/fitogether/fitogether-csv-processor';
import { TRAINING_BASELINE_METRICS } from '$lib/constants/metric-definition-ids';

type GameScoreFixture = {
	values: Array<{ metricDefinitionId: string; value: number }>;
	orgId: string;
};

const loadFixture = (relativePath: string) =>
	readFileSync(resolve(process.cwd(), relativePath), 'utf-8');

const buildTrainingBaseline = (fixture: GameScoreFixture) => {
	const map = new Map(fixture.values.map((entry) => [entry.metricDefinitionId, entry.value]));

	const baselineEntries = Object.entries(TRAINING_BASELINE_METRICS).map(([key, metricId]) => {
		const raw = map.get(metricId);
		const value = typeof raw === 'number' ? raw : Number(raw);
		if (!Number.isFinite(value) || value <= 0) {
			throw new Error(`Invalid baseline value for ${key} (${metricId}): ${raw}`);
		}
		return [key, value] as const;
	});

	return Object.fromEntries(baselineEntries) as {
		totalDistanceM: number;
		highIntensityM: number;
		accelerationCountTotal: number;
		decelerationCountTotal: number;
	};
};

describe('training score consumption fixtures', () => {
	it('matches training-scenario-2 output expectations', () => {
		const inputCsv = loadFixture('test-assets/training-scenario-2.input.csv');
		const outputCsv = loadFixture('test-assets/training-scenario-2.output.csv');
		const gameScoreJson = loadFixture('test-assets/training-scenario-2.gamescore.json');

		const rawRecords = parse(inputCsv, {
			columns: true,
			skip_empty_lines: true,
			bom: true,
			relax_column_count: true,
		}) as Array<Record<string, string>>;

		const originalHeaders =
			rawRecords.length > 0
				? Object.keys(rawRecords[0])
				: (inputCsv
						.split(/\r?\n/)[0]
						?.split(',')
						.map((h) => h.trim()) ?? []);

		const persons = rawRecords.map((record, index) => ({
			id: `player-${index + 1}`,
			fullName: record['Player Name'],
			externalId: record['Jersey No.'],
		}));

		const trainingBaseline = buildTrainingBaseline(JSON.parse(gameScoreJson) as GameScoreFixture);

		const processor = new FitogetherCsvProcessor({
			rawRecords,
			originalHeaders,
			persons,
		});

		const { parsers, unmatched } = processor.process({ trainingBaseline });

		expect(unmatched).toHaveLength(0);

		const expectedScores = outputCsv
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter(Boolean)
			.map((value) => Number(value));

		const actualScores = parsers.map((parser) => parser.trainingScoreConsumption);

		expect(actualScores).toHaveLength(expectedScores.length);
		expect(actualScores).toEqual(expectedScores);
	});
});
