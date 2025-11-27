import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { metricDefinitions, referenceTable } from '$lib/contents-provider/content';
import { requireBearer } from '$lib/contents-provider/auth';

type ScoreBody = {
	metricDefinitionId?: string;
	value?: number;
	referenceLevel?: string | null;
	context?: Record<string, unknown>;
};

const bucketScore = (value: number, mean: number, std: number) => {
	if (value < mean - 1.5 * std) return 1;
	if (value < mean - 0.5 * std) return 2;
	if (value < mean + 0.5 * std) return 3;
	if (value < mean + 1.5 * std) return 4;
	return 5;
};

export const POST: RequestHandler = async (event) => {
	await requireBearer(event);

	let body: ScoreBody = {};
	try {
		body = (await event.request.json()) as ScoreBody;
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const metricDefinitionId = body.metricDefinitionId?.trim();
	const value = body.value;
	const referenceLevel = body.referenceLevel ?? 'U16-U18';

	if (!metricDefinitionId || typeof value !== 'number') {
		throw error(400, 'metricDefinitionId and numeric value are required');
	}

	const metric = metricDefinitions.find((m) => m.id === metricDefinitionId);
	if (!metric) {
		throw error(404, 'metricDefinitionId not found');
	}

	const band = referenceTable[metricDefinitionId]?.[referenceLevel];
	if (!band) return json({ score: null });

	const baseScore = bucketScore(value, band.mean, band.std);
	const score =
		metric.betterDirection === 'LOWER_IS_BETTER' ? 6 - baseScore : baseScore;

	return json({
		score
	});
};
