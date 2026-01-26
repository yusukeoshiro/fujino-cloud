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
import {
	KnowsCsvProcessor,
	type KnowsPersonRecord,
} from '$lib/csv-processors/csv-processors/knows/knows-csv-processor';
import type { GameScoreValueEntry } from '$lib/services/game-score.service';
import type { SessionType } from '$lib/csv-processors/player-gps-session/gps-core.model';
import type { PlayerGpsSession } from '$lib/csv-processors/player-gps-session/player-gps-session';
import { organizationService } from '$lib/services/organization.service';
import {
	DEFAULT_CSV_VENDOR_FORMAT,
	CSV_VENDOR_FORMATS,
	type CsvVendorFormat,
} from '$lib/csv-processors/vendor-formats';

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

export function createKnowsProcessor(params: {
	rawRecords: Array<Record<string, string>>;
	originalHeaders: string[];
	persons: KnowsPersonRecord[];
	sessionDate?: string | null;
}) {
	const { rawRecords, originalHeaders, persons, sessionDate } = params;
	return new KnowsCsvProcessor({
		rawRecords,
		originalHeaders,
		persons,
		sessionDate,
	});
}

export function parseForm(form: FormData): {
	file: File | null;
	sessionType: SessionType;
	selectedRowIndexSet: Set<number> | null;
	vendorFormat: CsvVendorFormat | null;
	sessionDate: string | null;
} {
	const file = form.get('file');
	const raw = form.get('gpsCategory');
	const sessionType = typeof raw === 'string' && raw.toLowerCase() === 'game' ? 'GAME' : 'TRAINING';
	const selectedRowIndexSet = parseSelectedRowIndexSet(form);
	const rawVendorFormat = form.get('vendorFormat');
	const vendorFormat =
		typeof rawVendorFormat === 'string' &&
		CSV_VENDOR_FORMATS.includes(rawVendorFormat as CsvVendorFormat)
			? (rawVendorFormat as CsvVendorFormat)
			: null;
	const rawSessionDate = form.get('sessionDate');
	const sessionDate =
		typeof rawSessionDate === 'string' && rawSessionDate.trim().length > 0
			? rawSessionDate.trim()
			: null;

	return {
		file: file instanceof File ? file : null,
		sessionType,
		selectedRowIndexSet,
		vendorFormat,
		sessionDate,
	};
}

export async function resolveVendorFormat(
	orgId: string,
	vendorFormat: CsvVendorFormat | null,
): Promise<CsvVendorFormat> {
	if (vendorFormat) return vendorFormat;

	const organization = await organizationService.getById(orgId);
	const fromOrg = organization.defaultCsvVendorFormat;

	if (fromOrg && CSV_VENDOR_FORMATS.includes(fromOrg)) {
		return fromOrg;
	}

	return DEFAULT_CSV_VENDOR_FORMAT;
}

export async function buildCsvParseResult(params: {
	event: unknown;
	orgId: string;
	file: File;
	fallbackBirthday: string;
	vendorFormat?: CsvVendorFormat | null;
	sessionDate?: string | null;
}) {
	const { event, orgId, file, fallbackBirthday, sessionDate } = params;
	const vendorFormat = params.vendorFormat ?? DEFAULT_CSV_VENDOR_FORMAT;

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

	let parsers: PlayerGpsSession[] = [];
	let unmatched: Array<{ row: number; playerName: string; jerseyNo?: string }> = [];
	let headers: string[] = [];
	let headerMap: Array<{ field: string; metricDefinitionId: string }> = [];

	if (vendorFormat === 'KNOWS_V1') {
		const processor = createKnowsProcessor({
			rawRecords,
			originalHeaders,
			persons,
			sessionDate,
		});
		const result = processor.process({
			trainingBaseline,
			fallbackBirthday,
		});
		parsers = result.parsers;
		unmatched = result.unmatched;
		headers = result.headers;
		headerMap = result.headerMap;
	} else {
		const processor = createFitogetherProcessor({
			rawRecords,
			originalHeaders,
			persons,
		});
		const result = processor.process({
			trainingBaseline,
			fallbackBirthday,
		});
		parsers = result.parsers as PlayerGpsSession[];
		unmatched = result.unmatched;
		headers = result.headers;
		headerMap = result.headerMap;
	}

	if (sessionDate) {
		for (const parser of parsers) {
			parser.date = sessionDate;
		}
	}

	return {
		persons,
		trainingBaseline,
		parsers,
		unmatched,
		headers,
		headerMap,
		vendorFormat,
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
