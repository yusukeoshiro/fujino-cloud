import { error, type RequestHandler } from '@sveltejs/kit';
import { parse } from 'csv-parse/sync';
import {
	AutoRecordMetricMutateStore,
	AutoRecordMetricStore,
	CreatePerformanceAssessmentParticipantStore,
	CreatePerformanceAssessmentWrapperStore,
} from '$houdini';
import { DateTime } from 'luxon';
import { GamePointParser } from '../../../lib/game-point-parser';
import { GpsSessionParser } from '../../../lib/gps-session-parser.model';

// 1) Field → MetricDefinitionId map
const FIELD_TO_METRIC_ID: Record<string, string | undefined> = {
	'Duration (min)': 'KkLOxGTCHY2uVOMjLtQE',
	'Total Distance (m)': 'P6Zu5epLjDOaDQq20Stx',
	'Total Distance/min (m/min)': 'I7i8bessV96ciVnFw5IB',
	'Max Speed (km/h)': 'Q4dPRJ2eqeNR0Bg4DI3E',
	'No. of HSR (times)': undefined,
	'HSR Distance (m)': undefined,
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

const GAME_POINTS: Record<string, number> = {
	KkLOxGTCHY2uVOMjLtQE: 98,
	P6Zu5epLjDOaDQq20Stx: 11262,
	I7i8bessV96ciVnFw5IB: 115,
	Q4dPRJ2eqeNR0Bg4DI3E: 29.3,
};

// 2) number coercion (handles thousands separators)
function coerce(value: string): string | number {
	if (value === '') return value;
	const cleaned = value.replace(/,/g, '').trim();
	if (!isNaN(Number(cleaned)) && /^-?\d+(\.\d+)?$/.test(cleaned)) return Number(cleaned);
	return value;
}

export const POST: RequestHandler = async (event) => {
	const gamePoint = new GamePointParser({
		durationMin: 98,
		totalDistanceM: 11262,
		totalDistanceMPerMin: 115,
		maxSpeedKMH: 29.3,

		noOfHSR: 0,
		HSRDistanceM: 0,
		noOfSprint: 9.2,

		sprintDistanceM: 154,
		speedZone1DistanceM: 3593,
		speedZone3DistanceM: 0,
		speedZone4DistanceM: 0,
		speedZone5DistanceM: 0,

		accelerationZone4EntryCount: 0,
		accelerationZone5EntryCount: 71,
		accelerationZone6EntryCount: 57,

		decelerationZone4EntryCount: 0,
		decelerationZone5EntryCount: 75,
		decelerationZone6EntryCount: 79,

		noOfExpAcc: 13,
		noOfExpDec: 28,

		highIntensityM: 608,
		highIntensityRate: 0.056,
		walkingRate: 0.319,
		accelerationCountTotal: 129,
		decelerationCountTotal: 146,
	});

	const parsedRows: GpsSessionParser[] = [];

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
	const headerMap = originalHeaders
		.map((field) => ({
			field,
			metricDefinitionId: FIELD_TO_METRIC_ID[field] ?? '',
		}))
		.filter((item) => item.metricDefinitionId);

	rawRecords.forEach((row) => {
		const out: Record<string, string | number> = {};
		for (const [field, value] of Object.entries(row)) {
			const key = useMetricIds && FIELD_TO_METRIC_ID[field] ? FIELD_TO_METRIC_ID[field]! : field;
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
				gamePoint,
			),
		);

		return out;
	});

	// parsedRows.forEach((r) => {
	// 	// console.log(`${r.fullName} ${r.date} ${r.trainingScoreConsumption}`);
	// 	console.log(r.toJson());
	// });

	// const createPerformanceAssessment = new CreatePerformanceAssessmentWrapperStore();

	// const resultCreatePerformanceAssessment = await createPerformanceAssessment.mutate(
	// 	{
	// 		data: {
	// 			performanceAssessment: {
	// 				name: `${dt.toFormat('yyyy-MM-dd トレーニング')}`,
	// 				date: dt.toFormat('yyyy-MM-dd'),
	// 				orgId: 'd4ZtXDD8O5ZjqnI8XqX3',
	// 			},
	// 			performanceAssessmentMetrics: [
	// 				...headerMap.map((item, i) => {
	// 					return {
	// 						metricDefinitionId: item.metricDefinitionId,
	// 						scored: false,
	// 						displayOrder: i,
	// 						category: 'TRAINING',
	// 					};
	// 				}),
	// 				// TR Point consumption added last
	// 				{
	// 					metricDefinitionId: 'FSw4meWwvmxkcr4G0KvX',
	// 					scored: false,
	// 					displayOrder: headerMap.length,
	// 					category: 'TRAINING',
	// 				},
	// 			],
	// 			performanceAssessmentParticipants: [],
	// 		},
	// 	},
	// 	{
	// 		event,
	// 	},
	// );

	// console.log(resultCreatePerformanceAssessment.errors);
	// console.log(resultCreatePerformanceAssessment.data?.createPerformanceAssessmentWrapper);

	// Final headers after remap (unique + in order)
	const headers = Array.from(
		new Set(
			originalHeaders.map((field) =>
				useMetricIds && FIELD_TO_METRIC_ID[field] ? FIELD_TO_METRIC_ID[field]! : field,
			),
		),
	);

	// const createParticipant = new CreatePerformanceAssessmentParticipantStore();

	// const name2Token: { [key: string]: string } = {};

	// for (const record of records) {
	// 	const participant = await createParticipant.mutate(
	// 		{
	// 			data: {
	// 				orgId: 'd4ZtXDD8O5ZjqnI8XqX3',
	// 				performanceAssessmentId:
	// 					resultCreatePerformanceAssessment.data?.createPerformanceAssessmentWrapper.id,
	// 				fullName: record['Player Name'] as string,
	// 			},
	// 		},
	// 		{
	// 			event,
	// 		},
	// 	);

	// 	name2Token[record['Player Name']] = participant.data?.createPerformanceAssessmentParticipant
	// 		.orgUniqueToken as string;
	// 	console.log(`created ${record['Player Name'] as string}`);
	// }

	// console.log({ name2Token });

	// const autoRecord = new AutoRecordMetricMutateStore();

	// for (const record of records) {
	// 	const keys = Object.keys(record).filter((key) => FIELD_TO_METRIC_ID[key]);
	// 	for (const k of keys) {
	// 		const orgUniqueToken = name2Token[record['Player Name']];
	// 		// autoRecord.mutate({
	// 		// 	// data: { input: {} },
	// 		// });

	// 		await autoRecord.mutate(
	// 			// {
	// 			// 	data: {
	// 			// 		//
	// 			// 	},
	// 			// },
	// 			{
	// 				data: {
	// 					orgUniqueToken: orgUniqueToken,
	// 					metricDefinitionId: FIELD_TO_METRIC_ID[k]!,
	// 					performanceAssessmentId:
	// 						resultCreatePerformanceAssessment.data!.createPerformanceAssessmentWrapper.id!,
	// 					value: record[k] as number,
	// 					isOfficial: true,
	// 				},
	// 			},
	// 			{
	// 				event,
	// 			},
	// 		);

	// 		console.log(`metric definition id ${k} for ${orgUniqueToken} is set to ${record[k]}`);
	// 	}
	// }

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
