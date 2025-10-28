import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	gameScoreService,
	type GameScoreValueEntry
} from '$lib/services/game-score.service';

type GameScorePayload = {
	orgId?: string;
	values?: GameScoreValueEntry[];
};

export const POST: RequestHandler = async ({ request }) => {
	let body: GameScorePayload | null = null;
	try {
		body = (await request.json()) as GameScorePayload;
	} catch {
		// ignore parse errors
	}

	if (!body?.orgId || !Array.isArray(body.values)) {
		return json({ ok: false, message: 'orgId と values は必須です。' }, { status: 400 });
	}

	const sanitizedValues = sanitizeEntries(body.values);
	const saved = await gameScoreService.upsert(body.orgId, sanitizedValues);
	const savedAt = new Date().toISOString();

	console.log('Received /api/game-score payload:', body);

	return json(
		{
			ok: true,
			values: saved.values,
			savedAt,
			message: 'ゲームスコアを保存しました。'
		},
		{ status: 200 }
	);
};

const sanitizeEntries = (entries: GameScoreValueEntry[]): GameScoreValueEntry[] =>
	entries
		.filter((entry) => entry && entry.metricDefinitionId)
		.map((entry) => {
			const numericValue = Number(entry.value);
			return {
				metricDefinitionId: entry.metricDefinitionId,
				value: Number.isFinite(numericValue) ? numericValue : 0
			};
		});
