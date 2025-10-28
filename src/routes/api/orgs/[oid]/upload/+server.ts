import { error, type RequestHandler } from '@sveltejs/kit';
import { parse } from 'csv-parse/sync';
import { DateTime } from 'luxon';
import { GpsSessionParser } from '$lib/gps-session-parser.model';
import { gameScoreService, type GameScoreValueEntry } from '$lib/services/game-score.service';
import {
	METRIC_DEFINITION_IDS,
	TRAINING_BASELINE_METRICS
} from '$lib/constants/metric-definition-ids';
import { requireOrgAccess } from '../utils/require-org-access.util';

// 1) Field → MetricDefinitionId map
const FITOGETHER_FIELD_TO_METRIC_ID: Record<string, string | undefined> = {
	'Duration (min)': METRIC_DEFINITION_IDS.durationMin,
	'Total Distance (m)': METRIC_DEFINITION_IDS.totalDistanceM,
	'Total Distance/min (m/min)': METRIC_DEFINITION_IDS.totalDistancePerMin,
	'Max Speed (km/h)': METRIC_DEFINITION_IDS.maxSpeedKMH,
	'No. of HSR (times)': undefined,
	'HSR Distance (m)': undefined,
	'No. of Sprint (times)': METRIC_DEFINITION_IDS.noOfSprint,
	'Sprint Distance (m)': METRIC_DEFINITION_IDS.sprintDistanceM,
	'Speed Zone 1 Distance (m)': METRIC_DEFINITION_IDS.speedZone1DistanceM,
	'Speed Zone 3 Distance (m)': METRIC_DEFINITION_IDS.speedZone3DistanceM,
	'Speed Zone 4 Distance (m)': METRIC_DEFINITION_IDS.speedZone4DistanceM,
	'Speed Zone 5 Distance (m)': METRIC_DEFINITION_IDS.speedZone5DistanceM,
	'Acceleration Zone 4 Entry Count (times)': METRIC_DEFINITION_IDS.accelerationZone4EntryCount,
	'Acceleration Zone 5 Entry Count (times)': METRIC_DEFINITION_IDS.accelerationZone5EntryCount,
	'Acceleration Zone 6 Entry Count (times)': METRIC_DEFINITION_IDS.accelerationZone6EntryCount,
	'Deceleration Zone 4 Entry Count (times)': METRIC_DEFINITION_IDS.decelerationZone4EntryCount,
	'Deceleration Zone 5 Entry Count (times)': METRIC_DEFINITION_IDS.decelerationZone5EntryCount,
	'Deceleration Zone 6 Entry Count (times)': METRIC_DEFINITION_IDS.decelerationZone6EntryCount,
	'No. of Exp. Acc. (times)': METRIC_DEFINITION_IDS.noOfExpAcc,
	'No. of Exp. Dec. (times)': METRIC_DEFINITION_IDS.noOfExpDec,
};

// 2) number coercion (handles thousands separators)
function coerce(value: string): string | number {
	if (value === '') return value;
	const cleaned = value.replace(/,/g, '').trim();
	if (!isNaN(Number(cleaned)) && /^-?\d+(\.\d+)?$/.test(cleaned)) return Number(cleaned);
	return value;
}

export const POST: RequestHandler = async (event) => {
	const { request, url } = event;
	const orgId = requireOrgAccess(event);

	const baselineDocument = await gameScoreService.getByOrgId(orgId);
	if (!baselineDocument) {
		throw error(404, `ゲームスコア基準値が未設定です (orgId=${orgId})`);
	}

	const trainingBaseline = buildTrainingBaseline(orgId, baselineDocument.values);

	const parsedRows: GpsSessionParser[] = [];
	// Toggle: use metricDefinitionId as keys?
	const useMetricIds = /^(1|true|on)$/i.test(url.searchParams.get('metricDefinitionId') ?? '');

	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File)) return new Response('No file field named "file".', { status: 400 });

	const text = await file.text();

	const rawRecords = parse(text, {
		columns: true,
		skip_empty_lines: true,
		bom: true,
		relax_column_count: true,
	}) as Array<Record<string, string>>;

	// Determine original headers from first row or CSV header line
	const originalHeaders =
		rawRecords.length > 0
			? Object.keys(rawRecords[0])
			: (text
					.split(/\r?\n/)[0]
					?.split(',')
					.map((h) => h.trim()) ?? []);

	// Build header map (for Excel pasting or debugging)
	// Array of { field, metricDefinitionId }
	const headerMap = originalHeaders
		.map((field) => ({
			field,
			metricDefinitionId: FITOGETHER_FIELD_TO_METRIC_ID[field] ?? '',
		}))
		.filter((item) => item.metricDefinitionId);

	rawRecords.forEach((row) => {
		const out: Record<string, string | number> = {};
		for (const [field, value] of Object.entries(row)) {
			const key =
				useMetricIds && FITOGETHER_FIELD_TO_METRIC_ID[field]
					? FITOGETHER_FIELD_TO_METRIC_ID[field]!
					: field;
			out[key] = coerce(value);
		}

		// ✅ skip if same fullName already exists
		const fullName = out['Player Name'] as string;
		if (parsedRows.some((r) => r.fullName === fullName)) return;
		if (fullName === 'Team Average') return;

		parsedRows.push(
			new GpsSessionParser(
				{
					type: 'TRAINING',
					date: DateTime.fromFormat(out['Date'] as string, 'yyyy/M/d').toFormat('yyyy-MM-dd'),
					startTime: DateTime.fromFormat(out['Start Time'] as string, 'yyyy/M/d H:mm', {
						zone: 'Asia/Tokyo',
					}).toJSDate(),
					endTime: DateTime.fromFormat(out['End Time'] as string, 'yyyy/M/d H:mm', {
						zone: 'Asia/Tokyo',
					}).toJSDate(),

					fullName: out['Player Name'] as string,
					birthday: '0000-00-00',

					durationMin: Number(out['Duration (min)']),
					totalDistanceM: Number(out['Total Distance (m)']),
					totalDistanceMPerMin: Number(out['Total Distance/min (m/min)']),
					maxSpeedKMH: Number(out['Max Speed (km/h)']),

					noOfHSR: Number(out['No. of HSR (times)']),
					HSRDistanceM: Number(out['HSR Distance (m)']),

					noOfSprint: Number(out['No. of Sprint (times)']),
					sprintDistanceM: Number(out['Sprint Distance (m)']),
					speedZone1DistanceM: Number(out['Speed Zone 1 Distance (m)']),
					speedZone3DistanceM: Number(out['Speed Zone 3 Distance (m)']),
					speedZone4DistanceM: Number(out['Speed Zone 4 Distance (m)']),
					speedZone5DistanceM: Number(out['Speed Zone 5 Distance (m)']),

					accelerationZone4EntryCount: Number(out['Acceleration Zone 4 Entry Count (times)']),
					accelerationZone5EntryCount: Number(out['Acceleration Zone 5 Entry Count (times)']),
					accelerationZone6EntryCount: Number(out['Acceleration Zone 6 Entry Count (times)']),

					decelerationZone4EntryCount: Number(out['Deceleration Zone 4 Entry Count (times)']),
					decelerationZone5EntryCount: Number(out['Deceleration Zone 5 Entry Count (times)']),
					decelerationZone6EntryCount: Number(out['Deceleration Zone 6 Entry Count (times)']),

					noOfExpAcc: Number(out['No. of Exp. Acc. (times)']),
					noOfExpDec: Number(out['No. of Exp. Dec. (times)']),
				},
				trainingBaseline,
			),
		);

		return out;
	});

	const headers = Array.from(
		new Set(
			originalHeaders.map((field) =>
				useMetricIds && FITOGETHER_FIELD_TO_METRIC_ID[field]
					? FITOGETHER_FIELD_TO_METRIC_ID[field]!
					: field,
			),
		),
	);

	return new Response(
		JSON.stringify(
			{
				rows: parsedRows.length,
				headers, // keys present in each record (after remap)
				headerMap, // [{ field, metricDefinitionId }] — easy to copy to Excel
				records: parsedRows.map((r) => r.toJson()), // data rows (keys = either field names or metric IDs)
			},
			null,
			2,
		),
		{ headers: { 'content-type': 'application/json' } },
	);
};

function buildTrainingBaseline(orgId: string, entries: GameScoreValueEntry[]) {
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
		highIntensityM: number;
		accelerationCountTotal: number;
		decelerationCountTotal: number;
	};
}
