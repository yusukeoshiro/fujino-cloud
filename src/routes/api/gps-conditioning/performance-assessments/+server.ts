import { error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { ListPerformanceAssessmentsStore } from '$houdini';
import { getGpsType, isFujinoCreated } from '$lib/performance-assessments/metadata';

export const GET: RequestHandler = async (event) => {
	const orgId = event.url.searchParams.get('orgId');
	if (!orgId) {
		throw error(400, 'orgId is required');
	}

	const nextToken = event.url.searchParams.get('nextToken') || undefined;
	const prevToken = event.url.searchParams.get('prevToken') || undefined;
	const store = new ListPerformanceAssessmentsStore();
	const result = await store.fetch({
		event,
		variables: {
			orgId,
			nextToken,
			prevToken: nextToken ? undefined : prevToken,
		},
	});

	if (result.errors) {
		console.log(result.errors);
		return new Response(JSON.stringify({ errors: result.errors }), {
			headers: { 'content-type': 'application/json' },
			status: 500,
		});
	}

	const page = result.data?.listPerformanceAssessments;
	const records = page?.records ?? [];

	const payload = records.map((record) => {
		const metadata = record.metadata ?? [];
		const gpsType = getGpsType(metadata);
		return {
			id: record.id,
			name: record.name,
			date: record.date,
			description: record.description,
			orgId: record.orgId,
			participantsCount: record.participantsCount,
			ready: record.ready,
			exported: record.exported,
			inProgressExport: record.inProgressExport,
			inProgressSyncSheet: record.inProgressSyncSheet,
			downloadLink: record.downloadLink,
			spreadsheetUrl: record.spreadsheetUrl,
			createdAt: record.createdAt,
			updatedAt: record.updatedAt,
			metadata,
			gpsType,
			isFujinoCreated: isFujinoCreated(metadata),
		};
	});

	return new Response(
		JSON.stringify({
			records: payload,
			pageInfo: {
				count: page?.count ?? payload.length,
				hasNext: page?.hasNext ?? false,
				hasPrev: page?.hasPrev ?? false,
				nextToken: page?.nextToken ?? null,
				prevToken: page?.prevToken ?? null,
			},
		}),
		{
			headers: { 'content-type': 'application/json' },
		},
	);
};
