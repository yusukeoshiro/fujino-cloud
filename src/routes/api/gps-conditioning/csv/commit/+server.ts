import { error, type RequestHandler } from '@sveltejs/kit';
import { parse } from 'csv-parse/sync';
import { DateTime } from 'luxon';
import {
	AutoRecordMetricMutateStore,
	CreatePerformanceAssessmentParticipantStore,
	CreatePerformanceAssessmentWrapperStore,
	ExportPerformanceAssessmentStore,
	ListPersonsStore,
} from '$houdini';
import { FIELD_ID_MAP, trainigMetricDefinitionIds } from '$lib/training-cols';
import { gameScoreService, type GameScoreValueEntry } from '$lib/services/game-score.service';
import { TRAINING_BASELINE_METRICS } from '$lib/constants/metric-definition-ids';
import {
	FitogetherCsvProcessor,
	buildUnmatchedPersonsResponse,
} from '$lib/csv-processors/csv-processors/fitogether/fitogether-csv-processor';
import type { SessionType } from '$lib/csv-processors/player-gps-session/gps-core.model';

export const POST: RequestHandler = async (event) => {
	const { request, url } = event;
	const orgId = url.searchParams.get('orgId');
	if (!orgId) {
		throw error(400, 'orgId is required');
	}

	const form = await request.formData();
	const file = form.get('file');
	const sessionType = resolveSessionType(form);
	if (!(file instanceof File)) return new Response('No file field named "file".', { status: 400 });

	const selectedRowIndicesRaw = form.get('selectedRowIndices');
	let selectedRowIndexSet: Set<number> | null = null;
	if (typeof selectedRowIndicesRaw === 'string' && selectedRowIndicesRaw.trim().length > 0) {
		try {
			const parsed = JSON.parse(selectedRowIndicesRaw) as unknown;
			if (Array.isArray(parsed)) {
				selectedRowIndexSet = new Set(
					parsed
						.map((value) => Number(value))
						.filter((value) => Number.isInteger(value) && value >= 0),
				);
			}
		} catch (err) {
			console.log('Failed to parse selectedRowIndices', err);
		}
	}

	const listUsersStore = new ListPersonsStore();
	const personsResult = await listUsersStore.fetch({
		event,
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
		persons,
	});

	const { parsers: parsedRows, unmatched } = processor.process({
		trainingBaseline,
		fallbackBirthday: '2000-01-01',
	});

	if (unmatched.length > 0) {
		const response = buildUnmatchedPersonsResponse(unmatched);
		if (response) return response;
	}

	const createPerformanceAssessment = new CreatePerformanceAssessmentWrapperStore();

	if (parsedRows.length === 0) return new Response('File is empty.', { status: 400 });

	const selectionFlags = parsedRows.map((_, index) =>
		selectedRowIndexSet === null ? true : selectedRowIndexSet.has(index),
	);

	const dt = DateTime.fromFormat(parsedRows[0].date, 'yyyy-MM-dd');
	const sessionLabel = sessionType === 'GAME' ? 'ゲーム' : 'トレーニング';

	const resultCreatePerformanceAssessment = await createPerformanceAssessment.mutate(
		{
			data: {
				performanceAssessment: {
					name: `${dt.toFormat('yyyy-MM-dd')} ${sessionLabel}`,
					date: dt.toFormat('yyyy-MM-dd'),
					orgId,
					metadata: [
						{
							key: 'x-fujino-cloud-gps-type',
							value: sessionType,
						},
					],
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

	const performanceAssessmentId =
		resultCreatePerformanceAssessment.data?.createPerformanceAssessmentWrapper?.id;

	if (resultCreatePerformanceAssessment.errors || !performanceAssessmentId) {
		console.log(
			'Failed to create performance assessment',
			resultCreatePerformanceAssessment.errors,
		);
		return new Response(
			JSON.stringify({
				message: 'Failed to create performance assessment',
				errors: resultCreatePerformanceAssessment.errors,
			}),
			{ headers: { 'content-type': 'application/json' }, status: 500 },
		);
	}

	const createParticipant = new CreatePerformanceAssessmentParticipantStore();

	const promises = parsedRows.map(async (record, i) => {
		const isSelected = selectionFlags[i] ?? true;
		const result = await createParticipant.mutate(
			{
				data: {
					orgId,
					performanceAssessmentId,
					fullName: record.fullName,
					number: i + 1,
					...(record.birthday && { birthday: record.birthday }),
					...(isSelected
						? {}
						: {
								metadata: [
									{
										key: 'x-fujino-cloud-skip',
										value: 'true',
									},
								],
							}),
				},
			},
			{ event },
		);

		return { record, result, isSelected };
	});

	const results = await Promise.all(promises);

	for (const { record, result, isSelected } of results) {
		if (result.errors) {
			console.error('Failed to create performance assessment participant', {
				fullName: record.fullName,
				isSelected,
				errors: result.errors,
			});
		} else {
			console.log(`participant added ${record.fullName}${isSelected ? '' : ' (skipped)'}`);
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
							performanceAssessmentId,
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
						console.error('Failed to auto record metric', {
							fullName: record.fullName,
							metricKey: key,
							metricDefinitionId: FIELD_ID_MAP[key],
							errors: r.errors,
						});
					} else {
						console.log(`${record.fullName} ${key} is done with id ${r.data?.autoRecordMetric.id}`);
					}
				}),
		);

		await Promise.all(promises);
	}

	const exportStore = new ExportPerformanceAssessmentStore();
	console.log('===');
	const uploadResult = await exportStore.mutate(
		{
			performanceAssessmentId,
		},
		{
			event,
		},
	);
	console.log('done');

	if (uploadResult.errors) {
		console.error('Failed to export performance assessment', uploadResult.errors);
	}

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
		highIntensityDistanceM: number;
		accelerationCountTotal: number;
		decelerationCountTotal: number;
	};
}

function resolveSessionType(form: FormData): SessionType {
	const raw = form.get('gpsCategory');
	if (typeof raw === 'string' && raw.toLowerCase() === 'game') return 'GAME';
	return 'TRAINING';
}
