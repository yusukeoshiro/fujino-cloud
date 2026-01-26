import { error, type RequestHandler } from '@sveltejs/kit';
import { parse } from 'csv-parse/sync';
import { gameScoreService, type GameScoreValueEntry } from '$lib/services/game-score.service';
import {
	METRIC_DEFINITION_IDS,
	TRAINING_BASELINE_METRICS,
} from '$lib/constants/metric-definition-ids';
import { ListPersonsStore } from '$houdini';
import {
	FitogetherCsvProcessor,
	buildUnmatchedPersonsResponse,
} from '$lib/csv-processors/csv-processors/fitogether/fitogether-csv-processor';

// Field → MetricDefinitionId map
const FITOGETHER_FIELD_TO_METRIC_ID: Record<string, string | undefined> = {
	'Duration (min)': METRIC_DEFINITION_IDS.durationMin,
	'Total Distance (m)': METRIC_DEFINITION_IDS.totalDistanceM,
	'Total Distance/min (m/min)': METRIC_DEFINITION_IDS.totalDistancePerMin,
	'Max Speed (km/h)': METRIC_DEFINITION_IDS.maxSpeedKMH,
	'No. of HSR (times)': METRIC_DEFINITION_IDS.noOfHSR,
	'HSR Distance (m)': METRIC_DEFINITION_IDS.hsrDistanceM,
	'No. of Sprint (times)': METRIC_DEFINITION_IDS.noOfSprint,
	'Sprint Distance (m)': METRIC_DEFINITION_IDS.sprintDistanceM,
	'No. of Exp. Acc. (times)': METRIC_DEFINITION_IDS.noOfExpAcc,
	'No. of Exp. Dec. (times)': METRIC_DEFINITION_IDS.noOfExpDec,
};

export const POST: RequestHandler = async (event) => {
	const { request, url } = event;
	const orgId = url.searchParams.get('orgId');
	if (!orgId) {
		throw error(400, 'orgId is required');
	}

	const listUsersStore = new ListPersonsStore();
	const result = await listUsersStore.fetch({
		event,
		variables: {
			orgId,
		},
	});

	if (result.errors) {
		console.log(result.errors);
		return new Response(JSON.stringify({ errors: result.errors }), {
			headers: { 'content-type': 'application/json' },
			status: 500,
		});
	}

	const records = result.data?.listPersons?.records ?? [];

	const baselineDocument = await gameScoreService.getByOrgId(orgId);
	if (!baselineDocument) {
		throw error(404, `ゲームスコア基準値が未設定です (orgId=${orgId})`);
	}

	const trainingBaseline = buildTrainingBaseline(orgId, baselineDocument.values);

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

	const originalHeaders =
		rawRecords.length > 0
			? Object.keys(rawRecords[0])
			: (text
					.split(/\r?\n/)[0]
					?.split(',')
					.map((h) => h.trim()) ?? []);

	const processor = new FitogetherCsvProcessor({
		rawRecords,
		originalHeaders,
		persons: records,
		fieldToMetricId: FITOGETHER_FIELD_TO_METRIC_ID,
		useMetricIds,
	});

	const { parsers, unmatched, headers, headerMap } = processor.process({
		trainingBaseline,
		fallbackBirthday: '0000-00-00',
	});

	if (unmatched.length > 0) {
		const response = buildUnmatchedPersonsResponse(unmatched);
		if (response) return response;
	}

	return new Response(
		JSON.stringify(
			{
				rows: parsers.length,
				headers,
				headerMap,
				records: parsers.map((r, index) => ({
					__rowIndex: index,
					...r.toJson(),
				})),
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
