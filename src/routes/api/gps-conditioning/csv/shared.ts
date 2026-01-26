import { error } from '@sveltejs/kit';
import { parse } from 'csv-parse/sync';
import {
	METRIC_DEFINITION_IDS,
	TRAINING_BASELINE_METRICS,
} from '$lib/constants/metric-definition-ids';
import { ListPersonsStore } from '$houdini';
import { gameScoreService } from '$lib/services/game-score.service';
import {
	FitogetherCsvProcessor,
	type FitogetherPersonRecord,
} from '$lib/csv-processors/csv-processors/fitogether/fitogether-csv-processor';
import type { GameScoreValueEntry } from '$lib/services/game-score.service';
import type { SessionType } from '$lib/csv-processors/player-gps-session/gps-core.model';
import type { PlayerGpsSession } from '$lib/csv-processors/player-gps-session/player-gps-session';

export const FITOGETHER_FIELD_TO_METRIC_ID: Record<string, string | undefined> = {
	'Duration (min)': METRIC_DEFINITION_IDS.durationMin,
	'Total Distance (m)': METRIC_DEFINITION_IDS.totalDistanceM,
	'Total Distance/min (m/min)': METRIC_DEFINITION_IDS.totalDistanceMPerMin,
	'Max Speed (km/h)': METRIC_DEFINITION_IDS.maxSpeedKMH,
	'No. of HSR (times)': METRIC_DEFINITION_IDS.noOfHSR,
	'HSR Distance (m)': METRIC_DEFINITION_IDS.hsrDistanceM,
	'No. of Sprint (times)': METRIC_DEFINITION_IDS.sprintCount,
	'Sprint Distance (m)': METRIC_DEFINITION_IDS.sprintDistanceM,
	'No. of Exp. Acc. (times)': METRIC_DEFINITION_IDS.expAccCount,
	'No. of Exp. Dec. (times)': METRIC_DEFINITION_IDS.expDecCount,
};

export function parseCsvText(text: string) {
	const rawRecords = parse(text, {
		columns: true,
		skip_empty_lines: true,
		bom: true,
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
}

export function buildTrainingBaseline(orgId: string, entries: GameScoreValueEntry[]) {
	const map = new Map(entries.map((entry) => [entry.metricDefinitionId, entry.value]));

	const requiredValues = Object.entries(TRAINING_BASELINE_METRICS).map(([key, metricId]) => {
		const raw = map.get(metricId);
		const value = typeof raw === 'number' ? raw : Number(raw);
		if (!Number.isFinite(value) || value <= 0) {
			throw error(
				400,
				`ゲームスコア基準値 ${metricId} (${key}) が無効です。orgId=${orgId}, value=${raw}`,
			);
		}
		return [key, value] as const;
	});

	return Object.fromEntries(requiredValues) as {
		totalDistanceM: number;
		highIntensityDistanceM: number;
		accelerationCountTotal: number;
		decelerationCountTotal: number;
	};
}

export function createFitogetherProcessor(params: {
	rawRecords: Array<Record<string, string>>;
	originalHeaders: string[];
	persons: FitogetherPersonRecord[];
}) {
	const { rawRecords, originalHeaders, persons } = params;
	return new FitogetherCsvProcessor({
		rawRecords,
		originalHeaders,
		persons,
		fieldToMetricId: FITOGETHER_FIELD_TO_METRIC_ID,
	});
}

export function parseForm(form: FormData): {
	file: File | null;
	sessionType: SessionType;
	selectedRowIndexSet: Set<number> | null;
} {
	const file = form.get('file');
	const raw = form.get('gpsCategory');
	const sessionType = typeof raw === 'string' && raw.toLowerCase() === 'game' ? 'GAME' : 'TRAINING';
	const selectedRowIndexSet = parseSelectedRowIndexSet(form);
	return { file: file instanceof File ? file : null, sessionType, selectedRowIndexSet };
}

export async function buildFitogetherParseResult(params: {
	event: unknown;
	orgId: string;
	file: File;
	fallbackBirthday: string;
}) {
	const { event, orgId, file, fallbackBirthday } = params;

	const listUsersStore = new ListPersonsStore();
	const personsResult = await listUsersStore.fetch({
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		event: event as any,
		variables: {
			orgId,
		},
	});
	const persons = personsResult.data?.listPersons?.records ?? [];

	const baselineDocument = await gameScoreService.getByOrgId(orgId);
	if (!baselineDocument) {
		throw error(404, `ゲームスコア基準値が未設定です (orgId=${orgId})`);
	}
	const trainingBaseline = buildTrainingBaseline(orgId, baselineDocument.values);

	const text = await file.text();
	const { rawRecords, originalHeaders } = parseCsvText(text);

	const processor = createFitogetherProcessor({
		rawRecords,
		originalHeaders,
		persons,
	});

	const { parsers, unmatched, headers, headerMap } = processor.process({
		trainingBaseline,
		fallbackBirthday,
	});

	return {
		persons,
		trainingBaseline,
		parsers: parsers as PlayerGpsSession[],
		unmatched,
		headers,
		headerMap,
	};
}

export function parseSelectedRowIndexSet(form: FormData): Set<number> | null {
	const selectedRowIndicesRaw = form.get('selectedRowIndices');
	if (typeof selectedRowIndicesRaw !== 'string' || selectedRowIndicesRaw.trim().length === 0) {
		return null;
	}

	try {
		const parsed = JSON.parse(selectedRowIndicesRaw) as unknown;
		if (!Array.isArray(parsed)) return null;
		return new Set(
			parsed.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value >= 0),
		);
	} catch (err) {
		console.log('Failed to parse selectedRowIndices', err);
		return null;
	}
}
