import { error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { DeletePerformanceAssessmentStore, GetPerformanceAssessmentStore } from '$houdini';
import { METRIC_DEFINITION_IDS } from '$lib/constants/metric-definition-ids';
import { getGpsType, isFujinoCreated } from '$lib/performance-assessments/metadata';

async function fetchPerformanceAssessment(event: Parameters<RequestHandler>[0], id: string) {
	const store = new GetPerformanceAssessmentStore();
	const result = await store.fetch({
		event,
		variables: {
			id,
		},
	});

	if (result.errors) {
		console.log(result.errors);
		throw error(500, 'Failed to fetch performance assessment');
	}

	const record = result.data?.getPerformanceAssessment ?? null;
	if (!record) {
		throw error(404, 'Performance assessment not found');
	}

	return record;
}

export const GET: RequestHandler = async (event) => {
	const { params, url } = event;
	if (!params.id) {
		throw error(400, 'id is required');
	}
	const orgId = url.searchParams.get('orgId');
	const record = await fetchPerformanceAssessment(event, params.id);

	if (orgId && record.orgId && record.orgId !== orgId) {
		throw error(404, 'Performance assessment not found');
	}

	const metadata = record.metadata ?? [];
	const isCreatedByApp = isFujinoCreated(metadata);
	if (!isCreatedByApp) {
		throw error(403, 'Performance assessment was not created by this app');
	}

	const participants = (record.participants ?? []).map((participant) => {
		const workloadConsumptionMetric = (participant.metrics ?? []).find(
			(metric) => metric.metricDefinitionId === METRIC_DEFINITION_IDS.workloadConsumptionPoints,
		);
		const rawScore = workloadConsumptionMetric?.value ?? workloadConsumptionMetric?.score ?? null;
		const workloadConsumptionPoints =
			typeof rawScore === 'number' && Number.isFinite(rawScore) ? rawScore : null;
		const metadata = participant.metadata ?? [];
		const hasSkipMetadata = metadata.some(
			(entry) => entry?.key === 'x-fujino-cloud-skip' && entry?.value === 'true',
		);
		return {
			id: participant.id,
			fullName: participant.fullName,
			skipped: participant.attr1 === 'skipped' || hasSkipMetadata,
			workloadConsumptionPoints,
		};
	});

	return new Response(
		JSON.stringify({
			record: {
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
				gpsType: getGpsType(metadata),
				isFujinoCreated: isCreatedByApp,
				participants,
			},
		}),
		{ headers: { 'content-type': 'application/json' } },
	);
};

export const DELETE: RequestHandler = async (event) => {
	const { params, url } = event;
	if (!params.id) {
		throw error(400, 'id is required');
	}
	const orgId = url.searchParams.get('orgId');
	const record = await fetchPerformanceAssessment(event, params.id);

	if (orgId && record.orgId && record.orgId !== orgId) {
		throw error(404, 'Performance assessment not found');
	}

	const metadata = record.metadata ?? [];
	if (!isFujinoCreated(metadata)) {
		throw error(403, 'Performance assessment was not created by this app');
	}

	const store = new DeletePerformanceAssessmentStore();
	const result = await store.mutate(
		{
			id: params.id,
		},
		{
			event,
		},
	);

	if (result.errors) {
		console.log(result.errors);
		throw error(500, 'Failed to delete performance assessment');
	}

	return new Response(JSON.stringify({ id: params.id }), {
		headers: { 'content-type': 'application/json' },
	});
};
