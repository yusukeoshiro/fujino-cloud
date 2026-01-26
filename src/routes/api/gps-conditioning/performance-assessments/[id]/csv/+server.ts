import { error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { GetPerformanceAssessmentStore } from '$houdini';
import { getAdminStorage } from '$lib/admin-firebase';
import { isFujinoCreated } from '$lib/performance-assessments/metadata';

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
	if (!orgId) {
		throw error(400, 'orgId is required');
	}

	const record = await fetchPerformanceAssessment(event, params.id);
	if (record.orgId && record.orgId !== orgId) {
		throw error(404, 'Performance assessment not found');
	}

	if (!isFujinoCreated(record.metadata ?? [])) {
		return new Response(JSON.stringify({ url: null, exists: false }), {
			headers: { 'content-type': 'application/json' },
		});
	}

	const objectPath = `gps-conditioning/${orgId}/${params.id}/${params.id}.csv`;
	const bucket = getAdminStorage();
	const file = bucket.file(objectPath);
	const [exists] = await file.exists();

	if (!exists) {
		return new Response(JSON.stringify({ url: null, exists: false }), {
			headers: { 'content-type': 'application/json' },
		});
	}

	const baseName = sanitizeFilename(record.name || params.id);
	const downloadName = `${baseName || params.id}.csv`;
	const [urlSigned] = await file.getSignedUrl({
		action: 'read',
		expires: Date.now() + 10 * 60 * 1000,
		responseDisposition: `attachment; filename="${downloadName}"`,
	});

	return new Response(JSON.stringify({ url: urlSigned, exists: true }), {
		headers: { 'content-type': 'application/json' },
	});
};

function sanitizeFilename(value: string) {
	return value
		.trim()
		.replace(/[/\\?%*:|"<>]/g, '_')
		.replace(/\s+/g, '_')
		.slice(0, 120);
}
