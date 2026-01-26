import { error, type RequestHandler } from '@sveltejs/kit';
import { DateTime } from 'luxon';
import {
	AutoRecordMetricMutateStore,
	CreatePerformanceAssessmentParticipantStore,
	CreatePerformanceAssessmentWrapperStore,
	ExportPerformanceAssessmentStore,
} from '$houdini';
import { trainigMetricDefinitionIds } from '$lib/training-cols';
import { buildUnmatchedPersonsResponse } from '$lib/csv-processors/csv-processors/fitogether/fitogether-csv-processor';
import { buildMetricValues } from '$lib/csv-processors/player-gps-session/metric-record';
import { buildFitogetherParseResult, parseForm } from '../shared';

export const POST: RequestHandler = async (event) => {
	const { request, url } = event;
	const orgId = url.searchParams.get('orgId');
	if (!orgId) {
		throw error(400, 'orgId is required');
	}

	const form = await request.formData();
	const { file, sessionType, selectedRowIndexSet } = parseForm(form);
	if (!file) return new Response('No file field named "file".', { status: 400 });

	const { parsers: parsedRows, unmatched } = await buildFitogetherParseResult({
		event,
		orgId,
		file,
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
		const metricValues = buildMetricValues(record);
		const promises = trainigMetricDefinitionIds.map((metricDefinitionId) =>
			autoRecord
				.mutate(
					{
						data: {
							orgUniqueToken: record.orgUniqueToken!,
							metricDefinitionId,
							performanceAssessmentId,
							value: metricValues[metricDefinitionId] ?? 0,
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
							metricDefinitionId,
							errors: r.errors,
						});
					} else {
						console.log(
							`${record.fullName} ${metricDefinitionId} is done with id ${r.data?.autoRecordMetric.id}`,
						);
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
