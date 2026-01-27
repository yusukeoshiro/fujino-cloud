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
import { buildKnowsUnmatchedPersonsResponse } from '$lib/csv-processors/csv-processors/knows/knows-csv-processor';
import { buildMetricValues } from '$lib/csv-processors/player-gps-session/metric-record';
import { getAdminStorage } from '$lib/admin-firebase';
import { buildCsvParseResult, parseForm, resolveVendorFormat } from '../shared';

export const POST: RequestHandler = async (event) => {
	const { request, url } = event;
	const orgId = url.searchParams.get('orgId');
	if (!orgId) {
		throw error(400, 'orgId is required');
	}

	const form = await request.formData();
	const { file, sessionType, selectedRowIndexSet, sessionDate, vendorFormat } = parseForm(form);
	if (!file) return new Response('No file field named "file".', { status: 400 });
	if (!sessionDate) return new Response('sessionDate is required.', { status: 400 });

	const requestedVendorFormat = await resolveVendorFormat(orgId, vendorFormat);

	const {
		parsers: parsedRows,
		unmatched,
		vendorFormat: resolvedVendorFormat,
		headers,
	} = await buildCsvParseResult({
		event,
		orgId,
		file,
		fallbackBirthday: '2000-01-01',
		vendorFormat: requestedVendorFormat,
		sessionDate,
	});

	if (unmatched.length > 0) {
		const response =
			resolvedVendorFormat === 'KNOWS_V1'
				? buildKnowsUnmatchedPersonsResponse(
						unmatched.map((item) => ({ row: item.row, playerName: item.playerName })),
						headers,
					)
				: buildUnmatchedPersonsResponse(
						unmatched.map((item) => ({
							row: item.row,
							playerName: item.playerName,
							jerseyNo: 'jerseyNo' in item ? String(item.jerseyNo ?? '') : '',
						})),
					);
		if (response) return response;
	}

	if (parsedRows.length === 0) return new Response('File is empty.', { status: 400 });

	const selectionFlags = parsedRows.map((_, index) =>
		selectedRowIndexSet === null ? true : selectedRowIndexSet.has(index),
	);
	const metricValuesByRow = parsedRows.map((record) => buildMetricValues(record));
	const metricDefinitionIdsWithValues = trainigMetricDefinitionIds.filter((metricDefinitionId) =>
		metricValuesByRow.some((values) => hasMeaningfulValue(values[metricDefinitionId])),
	);

	const dt = DateTime.fromISO(sessionDate);
	if (!dt.isValid) {
		return new Response('sessionDate must be a valid yyyy-MM-dd date.', { status: 400 });
	}
	const sessionLabel = sessionType === 'GAME' ? 'ゲーム' : 'トレーニング';
	const effectiveVendorFormat = resolvedVendorFormat;

	const createPerformanceAssessment = new CreatePerformanceAssessmentWrapperStore();

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
						{
							key: 'x-fujino-cloud-gps-format',
							value: effectiveVendorFormat,
						},
					],
				},
				performanceAssessmentMetrics: [
					...metricDefinitionIdsWithValues.map((metricDefinitionId, i) => {
						return {
							metricDefinitionId: metricDefinitionId,
							scored: false,
							displayOrder: i + 1,
							category: 'WORKLOAD',
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

	await uploadRawCsvToStorage({
		orgId,
		performanceAssessmentId,
		vendorFormat: effectiveVendorFormat,
		sessionDate: dt.toFormat('yyyy-MM-dd'),
		sessionType,
		file,
		rowCount: parsedRows.length,
	});

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

	for (const [rowIndex, record] of parsedRows.entries()) {
		const metricValues = metricValuesByRow[rowIndex];
		const promises = metricDefinitionIdsWithValues.flatMap((metricDefinitionId) => {
			const value = metricValues[metricDefinitionId];
			if (!hasMeaningfulValue(value)) return [];
			return [
				autoRecord
					.mutate(
						{
							data: {
								orgUniqueToken: record.orgUniqueToken!,
								metricDefinitionId,
								performanceAssessmentId,
								value: value as number,
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
			];
		});

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

function hasMeaningfulValue(value: unknown): boolean {
	if (value === null || value === undefined || value === '') return false;
	if (typeof value === 'number') return Number.isFinite(value);
	return true;
}

async function uploadRawCsvToStorage(params: {
	orgId: string;
	performanceAssessmentId: string;
	vendorFormat: string;
	sessionDate: string;
	sessionType: string;
	file: File;
	rowCount: number;
}) {
	const { orgId, performanceAssessmentId, vendorFormat, sessionDate, sessionType, file, rowCount } =
		params;

	const buffer = Buffer.from(await file.arrayBuffer());
	const objectPath = `gps-conditioning/${orgId}/${performanceAssessmentId}/${performanceAssessmentId}.csv`;
	const metadata = {
		metadata: {
			orgId,
			performanceAssessmentId,
			vendorFormat,
			sessionDate,
			sessionType,
			originalFilename: file.name,
			rowCount: String(rowCount),
		},
		contentType: file.type || 'text/csv',
	};

	const bucket = getAdminStorage();
	await bucket.file(objectPath).save(buffer, {
		resumable: false,
		...metadata,
	});
}
