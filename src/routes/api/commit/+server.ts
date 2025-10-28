import { error, type RequestHandler } from '@sveltejs/kit';
import { parse } from 'csv-parse/sync';
import {
	AutoRecordMetricMutateStore,
	CreatePerformanceAssessmentParticipantStore,
	CreatePerformanceAssessmentWrapperStore,
	ExportPerformanceAssessmentStore,
} from '$houdini';
import { DateTime } from 'luxon';
import { GpsSessionParser } from '$lib/gps-session-parser.model';
import { FIELD_ID_MAP, trainigMetricDefinitionIds } from '$lib/training-cols';
import { gameScoreService, type GameScoreValueEntry } from '$lib/services/game-score.service';
import { TRAINING_BASELINE_METRICS } from '$lib/constants/metric-definition-ids';

// 2) number coercion (handles thousands separators)
function coerce(value: string): string | number {
	if (value === '') return value;
	const cleaned = value.replace(/,/g, '').trim();
	if (!isNaN(Number(cleaned)) && /^-?\d+(\.\d+)?$/.test(cleaned)) return Number(cleaned);
	return value;
}

export const POST: RequestHandler = async (event) => {
	const { request, url } = event;
	const orgId = url.searchParams.get('orgId');
	if (!orgId) {
		throw error(400, 'orgId is required');
	}

	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File)) return new Response('No file field named "file".', { status: 400 });

	const baselineDocument = await gameScoreService.getByOrgId(orgId);
	if (!baselineDocument) {
		throw error(404, `ゲームスコア基準値が未設定です (orgId=${orgId})`);
	}
	const trainingBaseline = buildTrainingBaseline(orgId, baselineDocument.values);

	const parsedRows: GpsSessionParser[] = [];

	const text = await file.text();
	const rawRecords = parse(text, {
		columns: true,
		skip_empty_lines: true,
		bom: true,
		relax_column_count: true,
	}) as Array<Record<string, string>>;

	rawRecords.forEach((row) => {
		const out: Record<string, string | number> = {};
		for (const [field, value] of Object.entries(row)) {
			out[field] = coerce(value);
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
					birthday: '2000-01-01',

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
	});

	const createPerformanceAssessment = new CreatePerformanceAssessmentWrapperStore();

	if (parsedRows.length === 0) return new Response('File is empty.', { status: 400 });

	const dt = DateTime.fromFormat(parsedRows[0].date, 'yyyy-MM-dd');

	const resultCreatePerformanceAssessment = await createPerformanceAssessment.mutate(
		{
			data: {
				performanceAssessment: {
					name: `${dt.toFormat('yyyy-MM-dd トレーニング')}`,
					date: dt.toFormat('yyyy-MM-dd'),
					orgId,
				},
				performanceAssessmentMetrics: [
					...trainigMetricDefinitionIds.map((metricDefinitionId, i) => {
						return {
							metricDefinitionId: metricDefinitionId,
							scored: false,
							displayOrder: i + 1,
							category: 'TRAINING',
						};
					}),
				],
				performanceAssessmentParticipants: [],
			},
		},
		{
			event,
		},
	);

	console.log(resultCreatePerformanceAssessment.errors);
	console.log(resultCreatePerformanceAssessment.data?.createPerformanceAssessmentWrapper);

	const createParticipant = new CreatePerformanceAssessmentParticipantStore();

	const promises = parsedRows.map(async (record, i) => {
		const result = await createParticipant.mutate(
			{
				data: {
					orgId,
					performanceAssessmentId:
						resultCreatePerformanceAssessment.data?.createPerformanceAssessmentWrapper.id,
					fullName: record.fullName,
					number: i + 1,
					...(record.birthday && { birthday: record.birthday }),
				},
			},
			{ event },
		);

		return { record, result }; // 👈 include context
	});

	const results = await Promise.all(promises);

	for (const { record, result } of results) {
		if (result.errors) {
			console.log(JSON.stringify(result.errors));
		} else {
			console.log(`participant added ${record.fullName}`);
		}

		record.orgUniqueToken = result.data?.createPerformanceAssessmentParticipant
			.orgUniqueToken as string;
	}

	const autoRecord = new AutoRecordMetricMutateStore();

	for (const record of parsedRows) {
		const promises = Object.keys(FIELD_ID_MAP).map((key) =>
			autoRecord
				.mutate(
					{
						data: {
							orgUniqueToken: record.orgUniqueToken!,
							metricDefinitionId: FIELD_ID_MAP[key],
							performanceAssessmentId:
								resultCreatePerformanceAssessment.data!.createPerformanceAssessmentWrapper.id!,
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							value: (record as any)[key],
							isOfficial: true,
						},
					},
					{
						event,
					},
				)
				.then((r) => {
					if (r.errors) {
						console.log(`${record.fullName} ${key} is ERROR`);
					} else {
						console.log(`${record.fullName} ${key} is done with id ${r.data?.autoRecordMetric.id}`);
					}
				}),
		);

		await Promise.all(promises);
	}

	const exportStore = new ExportPerformanceAssessmentStore();
	const uploadResult = await exportStore.mutate(
		{
			performanceAssessmentId:
				resultCreatePerformanceAssessment.data!.createPerformanceAssessmentWrapper.id!,
		},
		{
			event,
		},
	);

	if (uploadResult.errors) {
		console.log(uploadResult.errors);
	}

	// hten upload

	return new Response(JSON.stringify({}));
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
