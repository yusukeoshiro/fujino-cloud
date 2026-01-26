import { error, type RequestHandler } from '@sveltejs/kit';
import { buildUnmatchedPersonsResponse } from '$lib/csv-processors/csv-processors/fitogether/fitogether-csv-processor';
import type { PlayerGpsSession } from '$lib/csv-processors/player-gps-session/player-gps-session';
import { buildMetricValues } from '$lib/csv-processors/player-gps-session/metric-record';
import {
	FOOTER_COLS,
	HEADER_COLS,
	INTERMEDIATE_SCHEMA_COLS,
} from '../../../../_/orgs/[oid]/gps-conditioning/upload/utils/headers.util';
import { buildFitogetherParseResult, parseForm } from '../shared';

export const POST: RequestHandler = async (event) => {
	const { request, url } = event;
	const orgId = url.searchParams.get('orgId');
	if (!orgId) {
		throw error(400, 'orgId is required');
	}

	const form = await request.formData();
	const { file } = parseForm(form);
	if (!file) return new Response('No file field named "file".', { status: 400 });

	const useMetricIds = /^(1|true|on)$/i.test(url.searchParams.get('metricDefinitionId') ?? '');
	const {
		parsers: parsedRows,
		unmatched,
		headers,
		headerMap,
	} = await buildFitogetherParseResult({
		event,
		orgId,
		file,
		fallbackBirthday: '0000-00-00',
		useMetricIds,
	});

	if (unmatched.length > 0) {
		const response = buildUnmatchedPersonsResponse(unmatched);
		if (response) return response;
	}

	const previewRecords = parsedRows.map((parser, index) =>
		useMetricIds ? buildMetricRecord(parser, index) : buildLabelRecord(parser, index),
	);

	return new Response(
		JSON.stringify(
			{
				rows: parsedRows.length,
				headers,
				headerMap,
				columns: buildPreviewColumns(previewRecords, useMetricIds),
				records: previewRecords,
			},
			null,
			2,
		),
		{ headers: { 'content-type': 'application/json' } },
	);
};

function buildPreviewColumns(records: Array<Record<string, unknown>>, useMetricIds: boolean) {
	if (!records.length) return [];
	const available = new Set(Object.keys(records[0]).filter((key) => key !== '__rowIndex'));
	if (!useMetricIds) {
		return Array.from(available);
	}
	const coreColumns = [...HEADER_COLS, ...INTERMEDIATE_SCHEMA_COLS, ...FOOTER_COLS];
	return coreColumns.filter((key) => {
		if (!available.has(key)) return false;
		if (HEADER_COLS.includes(key) || FOOTER_COLS.includes(key)) return true;
		return records.some((record) => hasMeaningfulValue(record[key]));
	});
}

function hasMeaningfulValue(value: unknown): boolean {
	if (value === null || value === undefined || value === '') return false;
	if (typeof value === 'number') return Number.isFinite(value);
	return true;
}

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
		...buildMetricValues(parser),
	};
}
