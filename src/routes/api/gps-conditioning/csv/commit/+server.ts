import { error, type RequestHandler } from '@sveltejs/kit';
import { DateTime } from 'luxon';
import { Logger } from '$lib/server/logging';
import type { BulkAutoRecordMetric$input } from '$houdini';
import {
	CreatePerformanceAssessmentParticipantStore,
	CreatePerformanceAssessmentWrapperStore,
	ExportPerformanceAssessmentStore,
} from '$houdini';
import { env } from '$env/dynamic/private';
import { deviceTokenService } from '$lib/services/device-token.service';
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

	const logger = new Logger({ orgId, service: 'gps-commit' });
	logger.info('Request received');
	logger.debug('Parsing form data...');

	const form = await request.formData();
	const { file, sessionType, selectedRowIndexSet, sessionDate, vendorFormat } = parseForm(form);

	if (!file) {
		logger.error('No file found in request');
		return new Response('No file field named "file".', { status: 400 });
	}

	logger.info('Form parsed', { sessionDate, rowCount: selectedRowIndexSet?.size ?? 'ALL' });

	if (!sessionDate) return new Response('sessionDate is required.', { status: 400 });

	const requestedVendorFormat = await resolveVendorFormat(orgId, vendorFormat);
	logger.info('Resolved vendor format', { requestedVendorFormat });

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

	logger.info('CSV parsed', { rows: parsedRows.length, unmatchedCount: unmatched.length });

	if (unmatched.length > 0) {
		logger.warn('Unmatched players found', { unmatchedCount: unmatched.length });
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

	logger.info('Metrics identified', { count: metricDefinitionIdsWithValues.length });

	const dt = DateTime.fromISO(sessionDate);
	if (!dt.isValid) {
		return new Response('sessionDate must be a valid yyyy-MM-dd date.', { status: 400 });
	}
	const sessionLabel = sessionType === 'GAME' ? 'ゲーム' : 'トレーニング';
	const effectiveVendorFormat = resolvedVendorFormat;

	const createPerformanceAssessment = new CreatePerformanceAssessmentWrapperStore();

	logger.info('Creating PerformanceAssessment...');
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
		logger.error('Failed to create performance assessment', {
			errors: resultCreatePerformanceAssessment.errors,
		});
		return new Response(
			JSON.stringify({
				message: 'Failed to create performance assessment',
				errors: resultCreatePerformanceAssessment.errors,
			}),
			{ headers: { 'content-type': 'application/json' }, status: 500 },
		);
	}
	logger.info('PerformanceAssessment created', { performanceAssessmentId });

	// --- Async Processing Start ---
	logger.info('Starting async processing', { performanceAssessmentId });
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
			logger.info('Uploading raw CSV to storage...');
			await uploadRawCsvToStorage({
				orgId,
				performanceAssessmentId,
				vendorFormat: effectiveVendorFormat,
				sessionDate: dt.toFormat('yyyy-MM-dd'),
				sessionType,
				file,
				rowCount: parsedRows.length,
			});
			logger.info('Raw CSV uploaded');

			// Retrieve device token for manual GraphQL execution in background job
			const tokenDoc = await deviceTokenService.get(orgId);
			const token = tokenDoc?.token;

			if (!token) {
				const errorMsg = `No device token found for organization ${orgId}. Cannot execute background mutations.`;
				logger.error(errorMsg);
				throw new Error(errorMsg);
			}

			// Helper to execute GraphQL manually (background jobs don't have event context)
			const executeGraphql = async (query: string, variables: any) => {
				const response = await fetch(env.GRAPHQL_URL, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({ query, variables }),
				});
				if (!response.ok) {
					const text = await response.text();
					throw new Error(
						`GraphQL request failed: ${response.status} ${response.statusText} - ${text}`,
					);
				}
				return await response.json();
			};

			const createParticipant = new CreatePerformanceAssessmentParticipantStore();
			const results: { record: any; result: any; isSelected: boolean }[] = [];

			logger.info('Creating participants...');
			// Batch process participants to avoid overwhelming the DB
			const BATCH_SIZE = 5; // Reduced from 10 to improve stability
			for (let i = 0; i < parsedRows.length; i += BATCH_SIZE) {
				const batch = parsedRows.slice(i, i + BATCH_SIZE);
				const promises = batch.map(async (record, batchIndex) => {
					const absoluteIndex = i + batchIndex;
					const isSelected = selectionFlags[absoluteIndex] ?? true;
					try {
						// Use manual execution (background job has no event context)
						const result = await executeGraphql(createParticipant.artifact.raw, {
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
						});

						if (result.errors) {
							logger.error(`Failed to create participant: ${record.fullName}`, {
								errors: result.errors,
								row: absoluteIndex + 1,
							});
						} else {
							logger.info(`Participant created: ${record.fullName}`, {
								participantId: result.data?.createPerformanceAssessmentParticipant?.id,
								row: absoluteIndex + 1,
							});
						}
						return { record, result, isSelected };
					} catch (err: any) {
						// Catch network/unexpected errors (like 'fetch failed') per row
						logger.error(`Exception creating participant: ${record.fullName}`, {
							error: err.message,
							stack: err.stack,
							row: absoluteIndex + 1,
						});
						// Return a dummy result or throw depending on desired behavior.
						// To avoid crashing Promise.all, we return a failure object.
						return { record, result: { errors: [{ message: err.message }] }, isSelected };
					}
				});
				const batchResults = await Promise.all(promises);
				results.push(...batchResults);

				// Update progress
				try {
					await jobRef.update({
						processedRows: Math.min(i + BATCH_SIZE, parsedRows.length),
					});
					logger.debug(
						`Processed participants batch: ${Math.min(i + BATCH_SIZE, parsedRows.length)}/${parsedRows.length}`,
					);
				} catch (err: any) {
					logger.warn('Failed to update job progress (participants)', { error: err.message });
					// Continue even if progress update fails
				}
			}
			logger.info('All participants processed');

			// Assign orgUniqueToken to records
			for (let i = 0; i < results.length; i++) {
				const { record, result, isSelected } = results[i];
				if (result.errors) {
					const errorMsg = `Row ~${results[i].record.row ?? '?'}: Found player "${record.fullName}" but failed to link/create. ${JSON.stringify(result.errors)}`;
					logger.error(errorMsg);
					await pushError(errorMsg);
				}
				if (result.data?.createPerformanceAssessmentParticipant?.orgUniqueToken) {
					record.orgUniqueToken = result.data.createPerformanceAssessmentParticipant.orgUniqueToken;
				}
			}

			// Update stage to METRICS
			logger.info('Switching to METRICS stage');
			await jobRef.update({
				stage: 'METRICS',
				processedRows: 0,
				totalRows: parsedRows.length,
			});

			// Collect all metrics for bulk insertion in a single request
			logger.info('Collecting metrics for bulk insertion...');
			const bulkDataPayload: BulkAutoRecordMetric$input['data'] = [];

			parsedRows.forEach((record, index) => {
				if (!record.orgUniqueToken) {
					logger.warn(`Skipping metrics for row ${index + 1}: No orgUniqueToken`);
					return;
				}

				const metricValues = metricValuesByRow[index];
				metricDefinitionIdsWithValues.forEach((metricDefinitionId) => {
					const value = metricValues[metricDefinitionId];
					if (!hasMeaningfulValue(value)) return;

					bulkDataPayload.push({
						orgUniqueToken: record.orgUniqueToken!,
						metricDefinitionId,
						performanceAssessmentId,
						value: value as number,
						isOfficial: true,
					});
				});
			});

			if (bulkDataPayload.length === 0) {
				logger.warn('No valid metrics found to insert');
			} else {
				logger.info(`Bulk recording ${bulkDataPayload.length} metrics in a single request...`);

				try {
					// Use manual execution (background job has no event context)
					const bulkMutation = `
						mutation BulkAutoRecordMetric($data: [AutoRecordMetric!]!) {
							bulkAutoRecordMetric(data: { data: $data }) {
								id
								metricDefinitionId
								value
							}
						}
					`;

					const result = await executeGraphql(bulkMutation, {
						data: bulkDataPayload,
					});

					if (result.errors) {
						const errorMsg = `Failed to bulk record metrics. Errors: ${JSON.stringify(result.errors)}`;
						logger.error(errorMsg);
						await pushError(errorMsg);
					} else {
						const createdCount = result.data?.bulkAutoRecordMetric?.length ?? 0;
						logger.info(`Successfully bulk recorded ${createdCount} metrics`);
					}
				} catch (err: any) {
					logger.error('Exception during bulk metrics recording', { error: err.message });
					// Continue to export even if metrics fail
				}

				// Update progress
				try {
					await jobRef.update({
						processedRows: parsedRows.length,
						errorDetails: collectedErrors,
					});
				} catch (err: any) {
					logger.warn('Failed to update job progress (metrics)', { error: err.message });
				}
			}
			logger.info('All metrics processed');

			// Update stage to EXPORTING
			logger.info('Switching to EXPORTING stage');
			await jobRef.update({
				stage: 'EXPORTING',
			});

			const exportStore = new ExportPerformanceAssessmentStore();
			logger.info('Triggering export...');
			try {
				// Use manual execution (background job has no event context)
				const uploadResult = await executeGraphql(exportStore.artifact.raw, {
					performanceAssessmentId,
				});

				if (uploadResult.errors) {
					logger.error('Failed to export performance assessment', { errors: uploadResult.errors });
					throw new Error('Failed to export performance assessment');
				}
				logger.info('Export successful');
			} catch (err: any) {
				logger.error('Exception during export', { error: err.message });
				throw err; // This is the last step, so failing here is correct behavior for job status
			}

			await jobRef.update({
				status: 'COMPLETED',
				completedAt: new Date(),
			});
			logger.info('Job COMPLETED successfully');
		} catch (e: any) {
			// Log the full error object as the 'error' metadata for Cloud Logging analysis
			// Also log message clearly
			logger.error(`Background job failed: ${e.message}`, { error: e, stack: e.stack });
			await jobRef.update({
				status: 'ERROR',
				errorMessage: e.message || 'Unknown error occurred',
				errorDetails: collectedErrors,
				failedAt: new Date(),
			});
		}
	})();

	logger.info('Initial request processing complete. Returning Job ID', { jobId });
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
