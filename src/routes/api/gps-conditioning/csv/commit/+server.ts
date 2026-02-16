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
import { getAdminStorage, adminDb } from '$lib/admin-firebase';
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
					unmatched.map((item) =>
						'rows' in item
							? { rows: item.rows, playerName: item.playerName, userId: item.userId }
							: { rows: [item.row], playerName: item.playerName },
					),
					headers,
				)
				: buildUnmatchedPersonsResponse(
					unmatched
						.filter(
							(item): item is { row: number; playerName: string; jerseyNo?: string } =>
								'row' in item,
						)
						.map((item) => ({
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

	// --- Async Processing Start ---
	const jobId = performanceAssessmentId!;
	const jobRef = adminDb.doc(`gps-upload-status/${jobId}`);

	await jobRef.set({
		status: 'PROCESSING',
		totalRows: parsedRows.length,
		processedRows: 0,
		createdAt: new Date(),
		performanceAssessmentId,
		orgId, // Add orgId for potential rule filtering
		createdBy: event.locals.user?.uid, // Add creator UID for security rules
		stage: 'PARTICIPANTS', // Tracking the current processing stage
		errorDetails: [], // Store granular errors
	});

	// Fire and forget - processing in background
	(async () => {
		const collectedErrors: string[] = [];
		const MAX_ERRORS = 20;

		const pushError = async (msg: string) => {
			if (collectedErrors.length >= MAX_ERRORS) return;
			collectedErrors.push(msg);
			if (collectedErrors.length === MAX_ERRORS) {
				collectedErrors.push('...and more errors (truncated)');
			}
			// Update occasionally or at end? Real-time is better for "all errors"
			// But careful with write limits. Let's update in the batch loops.
		};
		try {
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
			const results: { record: any; result: any; isSelected: boolean }[] = [];

			// Batch process participants to avoid overwhelming the DB
			const BATCH_SIZE = 10;
			for (let i = 0; i < parsedRows.length; i += BATCH_SIZE) {
				const batch = parsedRows.slice(i, i + BATCH_SIZE);
				const promises = batch.map(async (record, batchIndex) => {
					const absoluteIndex = i + batchIndex;
					const isSelected = selectionFlags[absoluteIndex] ?? true;
					const result = await createParticipant.mutate(
						{
							data: {
								orgId,
								performanceAssessmentId,
								fullName: record.fullName,
								number: absoluteIndex + 1,
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
				const batchResults = await Promise.all(promises);
				results.push(...batchResults);

				// Update progress
				await jobRef.update({
					processedRows: Math.min(i + BATCH_SIZE, parsedRows.length),
				});
			}

			// Assign orgUniqueToken to records
			for (let i = 0; i < results.length; i++) {
				const { record, result, isSelected } = results[i];
				if (result.errors) {
					const errorMsg = `Row ~${results[i].record.row ?? '?'}: Found player "${record.fullName}" but failed to link/create. ${JSON.stringify(result.errors)}`;
					console.error(errorMsg);
					await pushError(errorMsg);
				}
				if (result.data?.createPerformanceAssessmentParticipant?.orgUniqueToken) {
					record.orgUniqueToken =
						result.data.createPerformanceAssessmentParticipant.orgUniqueToken;
				}
			}

			const autoRecord = new AutoRecordMetricMutateStore();

			// Update stage to METRICS
			await jobRef.update({
				stage: 'METRICS',
				processedRows: 0,
				totalRows: parsedRows.length,
			});

			// Batch process metrics
			for (const [rowIndex, record] of parsedRows.entries()) {
				if (!record.orgUniqueToken) continue; // Skip if participant creation failed

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
							.then(async (r) => {
								if (r.errors) {
									const errorMsg = `Row ~${rowIndex + 1}: Failed to save metric ${metricDefinitionId}. ${JSON.stringify(r.errors)}`;
									console.error(errorMsg);
									await pushError(errorMsg);
								}
							}),
					];
				});

				await Promise.all(promises);

				// Update progress occasionally (every 10 rows or so to reduce writes)
				if ((rowIndex + 1) % 5 === 0 || rowIndex === parsedRows.length - 1) {
					await jobRef.update({
						processedRows: rowIndex + 1,
						errorDetails: collectedErrors,
					});
				}
			}

			// Update stage to EXPORTING
			await jobRef.update({
				stage: 'EXPORTING',
			});

			const exportStore = new ExportPerformanceAssessmentStore();
			const uploadResult = await exportStore.mutate(
				{
					performanceAssessmentId,
				},
				{
					event,
				},
			);

			if (uploadResult.errors) {
				console.error('Failed to export performance assessment', uploadResult.errors);
				throw new Error('Failed to export performance assessment');
			}

			await jobRef.update({
				status: 'COMPLETED',
				completedAt: new Date(),
			});
		} catch (e: any) {
			console.error('Background job failed', e);
			await jobRef.update({
				status: 'ERROR',
				errorMessage: e.message || 'Unknown error occurred',
				errorDetails: collectedErrors,
				failedAt: new Date(),
			});
		}
	})();

	return new Response(JSON.stringify({ jobId }));
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
