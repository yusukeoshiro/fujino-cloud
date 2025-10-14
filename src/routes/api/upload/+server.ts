import { error, type RequestHandler } from '@sveltejs/kit';
import { parse } from 'csv-parse/sync';
import {
	AutoRecordMetricMutateStore,
	AutoRecordMetricStore,
	CreatePerformanceAssessmentParticipantStore,
	CreatePerformanceAssessmentWrapperStore,
} from '$houdini';
import { DateTime } from 'luxon';

// 1) Field → MetricDefinitionId map
const FIELD_TO_METRIC_ID: Record<string, string | undefined> = {
	'Duration (min)': 'KkLOxGTCHY2uVOMjLtQE',
	'Total Distance (m)': 'P6Zu5epLjDOaDQq20Stx',
	'Total Distance/min (m/min)': 'I7i8bessV96ciVnFw5IB',
	'Max Speed (km/h)': 'Q4dPRJ2eqeNR0Bg4DI3E',
	'No. of HSR (times)': undefined,
	'HSR Distance (m)': 'Kn39OEkrpQCMQAtMQb5J',
	'No. of Sprint (times)': 'ZfqkRYcNfvwYioquCx5h',
	'Sprint Distance (m)': 'mVykVPzBokSZ0l4C7YhJ',
	'Speed Zone 1 Distance (m)': '0xbH1n71xspfVRddG92Q',
	'Speed Zone 3 Distance (m)': 'j6u2oo2CjbSngFLioS2Q',
	'Speed Zone 4 Distance (m)': 'oKXeSMbv7zfV7WjTV4Wp',
	'Speed Zone 5 Distance (m)': 'nulFBwmrHVrA20HPtNrp',
	'Acceleration Zone 4 Entry Count (times)': '4Pf9FuE2agjFASX1acXF',
	'Acceleration Zone 5 Entry Count (times)': 'kCZxKxfA9MfWVgBmdTbo',
	'Acceleration Zone 6 Entry Count (times)': 'YR3ZEOZLTLwJk23XKVpj',
	'Deceleration Zone 4 Entry Count (times)': 'FSmTTs8BG3fq608Zcy4F',
	'Deceleration Zone 5 Entry Count (times)': 'g60b48TuNLrtstb0dy65',
	'Deceleration Zone 6 Entry Count (times)': 'mPoLSRIgbc1IwC3fPsP9',
	'No. of Exp. Acc. (times)': 'XLp9zGyDi0PgkNHn61ln',
	'No. of Exp. Dec. (times)': 'vMV5RRPagpuPxkoU8F2T',
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
	const headerMap = originalHeaders.map((field) => ({
		field,
		metricDefinitionId: FIELD_TO_METRIC_ID[field] ?? '',
	}));

	const records = rawRecords.map((row) => {
		const out: Record<string, string | number> = {};
		for (const [field, value] of Object.entries(row)) {
			const key = useMetricIds && FIELD_TO_METRIC_ID[field] ? FIELD_TO_METRIC_ID[field]! : field;
			out[key] = coerce(value);
		}
		return out;
	});

	const firstDate = records[0]?.['Date'];
	const dt = DateTime.fromFormat(firstDate as string, 'yyyy/M/d');

	for (const record of records) {
		if (record['Date'] !== firstDate) {
			throw error(400, 'Missing required "date" field');
		}
	}

	const createPerformanceAssessment = new CreatePerformanceAssessmentWrapperStore();

	const resultCreatePerformanceAssessment = await createPerformanceAssessment.mutate(
		{
			data: {
				performanceAssessment: {
					name: `${dt.toFormat('yyyy-MM-dd トレーニング')}`,
					date: dt.toFormat('yyyy-MM-dd'),
					orgId: 'd4ZtXDD8O5ZjqnI8XqX3',
				},
				performanceAssessmentMetrics: headerMap
					.filter((item) => item.metricDefinitionId)
					.map((item, i) => {
						return {
							metricDefinitionId: item.metricDefinitionId,
							scored: false,
							displayOrder: i,
							category: 'TRAINING',
						};
					}),
				performanceAssessmentParticipants: [],
			},
		},
		{
			event,
		},
	);

	console.log(resultCreatePerformanceAssessment.errors);
	console.log(resultCreatePerformanceAssessment.data?.createPerformanceAssessmentWrapper);

	// Final headers after remap (unique + in order)
	const headers = Array.from(
		new Set(
			originalHeaders.map((field) =>
				useMetricIds && FIELD_TO_METRIC_ID[field] ? FIELD_TO_METRIC_ID[field]! : field,
			),
		),
	);

	const createParticipant = new CreatePerformanceAssessmentParticipantStore();

	const name2Token: { [key: string]: string } = {};

	for (const record of records) {
		const participant = await createParticipant.mutate(
			{
				data: {
					orgId: 'd4ZtXDD8O5ZjqnI8XqX3',
					performanceAssessmentId:
						resultCreatePerformanceAssessment.data?.createPerformanceAssessmentWrapper.id,
					fullName: record['Player Name'] as string,
				},
			},
			{
				event,
			},
		);

		name2Token[record['Player Name']] = participant.data?.createPerformanceAssessmentParticipant
			.orgUniqueToken as string;
		console.log(`created ${record['Player Name'] as string}`);
	}

	console.log({ name2Token });

	const autoRecord = new AutoRecordMetricMutateStore();

	for (const record of records) {
		const keys = Object.keys(record).filter((key) => FIELD_TO_METRIC_ID[key]);
		for (const k of keys) {
			const orgUniqueToken = name2Token[record['Player Name']];
			// autoRecord.mutate({
			// 	// data: { input: {} },
			// });

			await autoRecord.mutate(
				// {
				// 	data: {
				// 		//
				// 	},
				// },
				{
					data: {
						orgUniqueToken: orgUniqueToken,
						metricDefinitionId: FIELD_TO_METRIC_ID[k]!,
						performanceAssessmentId:
							resultCreatePerformanceAssessment.data!.createPerformanceAssessmentWrapper.id!,
						value: record[k] as number,
						isOfficial: true,
					},
				},
				{
					event,
				},
			);

			console.log(`metric definition id ${k} for ${orgUniqueToken} is set to ${record[k]}`);
		}
	}

	return new Response(
		JSON.stringify(
			{
				rows: records.length,
				headers, // keys present in each record (after remap)
				headerMap, // [{ field, metricDefinitionId }] — easy to copy to Excel
				records, // data rows (keys = either field names or metric IDs)
			},
			null,
			2,
		),
		{ headers: { 'content-type': 'application/json' } },
	);
};
