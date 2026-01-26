import { error, type RequestHandler } from '@sveltejs/kit';
import { DateTime } from 'luxon';
import { buildUnmatchedPersonsResponse } from '$lib/csv-processors/csv-processors/fitogether/fitogether-csv-processor';
import { buildKnowsUnmatchedPersonsResponse } from '$lib/csv-processors/csv-processors/knows/knows-csv-processor';
import type { PlayerGpsSession } from '$lib/csv-processors/player-gps-session/player-gps-session';
import { buildMetricValues } from '$lib/csv-processors/player-gps-session/metric-record';
import { buildMetricMeta } from '$lib/contents-provider/metric-labels';
import {
	HEADER_COLS,
	INTERMEDIATE_SCHEMA_COLS,
} from '../../../../_/orgs/[oid]/gps-conditioning/upload/utils/headers.util';
import { buildCsvParseResult, parseForm, resolveVendorFormat } from '../shared';

export const POST: RequestHandler = async (event) => {
	const { request, url } = event;
	const orgId = url.searchParams.get('orgId');
	if (!orgId) {
		throw error(400, 'orgId is required');
	}

	const form = await request.formData();
	const { file, vendorFormat } = parseForm(form);
	if (!file) return new Response('No file field named "file".', { status: 400 });

	const effectiveVendorFormat = await resolveVendorFormat(orgId, vendorFormat);

	const {
		parsers: parsedRows,
		unmatched,
		headers,
		headerMap,
		vendorFormat: resolvedVendorFormat,
	} = await buildCsvParseResult({
		event,
		orgId,
		file,
		fallbackBirthday: '0000-00-00',
		vendorFormat: effectiveVendorFormat,
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

	const previewRecords = parsedRows.map((parser, index) => buildMetricRecord(parser, index));
	const metricMeta = buildMetricMeta();
	const inferredSessionDate = inferSessionDate(resolvedVendorFormat, parsedRows);

	return new Response(
		JSON.stringify(
			{
				rows: parsedRows.length,
				headers,
				headerMap,
				columns: buildPreviewColumns(previewRecords).map((key) => {
					const meta = metricMeta.get(key);
					return {
						key,
						label: meta?.label ?? key,
						unit: meta?.unit,
						roundingPrecision: meta?.roundingPrecision,
					};
				}),
				records: previewRecords,
				inferredSessionDate,
			},
			null,
			2,
		),
		{ headers: { 'content-type': 'application/json' } },
	);
};

function buildPreviewColumns(records: Array<Record<string, unknown>>) {
	if (!records.length) return [];
	const available = new Set(Object.keys(records[0]).filter((key) => key !== '__rowIndex'));
	const coreColumns = [...HEADER_COLS, ...INTERMEDIATE_SCHEMA_COLS];
	return coreColumns.filter((key) => {
		if (!available.has(key)) return false;
		if (HEADER_COLS.includes(key)) return true;
		return records.some((record) => hasMeaningfulValue(record[key]));
	});
}

function hasMeaningfulValue(value: unknown): boolean {
	if (value === null || value === undefined || value === '') return false;
	if (typeof value === 'number') return Number.isFinite(value);
	return true;
}

function buildMetricRecord(parser: PlayerGpsSession, index: number) {
	return {
		__rowIndex: index,
		fullName: parser.fullName,
		...buildMetricValues(parser),
	};
}

function inferSessionDate(vendorFormat: string | null | undefined, records: PlayerGpsSession[]) {
	if (vendorFormat !== 'FITOGETHER_V1') return null;
	const raw = records[0]?.date;
	if (!raw) return null;
	const parsed = DateTime.fromISO(raw);
	if (!parsed.isValid) return null;
	return parsed.toFormat('yyyy-MM-dd');
}
