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
import type { PlayerGpsSession } from '$lib/csv-processors/player-gps-session/player-gps-session';

// Field → MetricDefinitionId map
const FITOGETHER_FIELD_TO_METRIC_ID: Record<string, string | undefined> = {
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
				records: parsers.map((parser, index) =>
					useMetricIds ? buildMetricRecord(parser, index) : buildLabelRecord(parser, index),
				),
			},
			null,
			2,
		),
		{ headers: { 'content-type': 'application/json' } },
	);
};

function buildLabelRecord(parser: PlayerGpsSession, index: number) {
	return {
		__rowIndex: index,
		...parser.toJson(),
	};
}

function buildMetricRecord(parser: PlayerGpsSession, index: number) {
	return {
		__rowIndex: index,
		fullName: parser.fullName,
		[METRIC_DEFINITION_IDS.durationMin]: parser.durationMin,
		[METRIC_DEFINITION_IDS.totalDistanceM]: parser.totalDistanceM,
		[METRIC_DEFINITION_IDS.totalDistanceMPerMin]: parser.totalDistanceMPerMin,
		[METRIC_DEFINITION_IDS.maxSpeedKMH]: parser.maxSpeedKMH,
		[METRIC_DEFINITION_IDS.noOfHSR]: parser.noOfHSR,
		[METRIC_DEFINITION_IDS.hsrDistanceM]: parser.hsrDistanceM,
		[METRIC_DEFINITION_IDS.sprintCount]: parser.sprintCount,
		[METRIC_DEFINITION_IDS.sprintDistanceM]: parser.sprintDistanceM,
		[METRIC_DEFINITION_IDS.highIntensityDistanceM]: parser.highIntensityDistanceM,
		[METRIC_DEFINITION_IDS.highIntensityRate]: parser.highIntensityRate,
		[METRIC_DEFINITION_IDS.lowIntensityRate]: parser.lowIntensityRate,
		[METRIC_DEFINITION_IDS.accelerationCountTotal]: parser.accelerationCountTotal,
		[METRIC_DEFINITION_IDS.expAccCount]: parser.expAccCount,
		[METRIC_DEFINITION_IDS.decelerationCountTotal]: parser.decelerationCountTotal,
		[METRIC_DEFINITION_IDS.expDecCount]: parser.expDecCount,
		[METRIC_DEFINITION_IDS.trainingScoreConsumption]: parser.trainingScoreConsumption,
	};
}

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
		highIntensityDistanceM: number;
		accelerationCountTotal: number;
		decelerationCountTotal: number;
	};
}
