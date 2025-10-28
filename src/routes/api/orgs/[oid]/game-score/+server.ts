import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { gameScoreService, type GameScoreValueEntry } from '$lib/services/game-score.service';
import { requireOrgAccess } from '../utils/require-org-access.util';

type GameScorePayload = {
	values?: GameScoreValueEntry[];
};

export const POST: RequestHandler = async (event) => {
	const orgId = requireOrgAccess(event.params.oid, event.locals.user);

	let body: GameScorePayload | null = null;
	try {
		body = (await event.request.json()) as GameScorePayload;
	} catch {
		// ignore parse errors
	}

	if (!body?.values || !Array.isArray(body.values)) {
		return json({ ok: false, message: 'values は配列で指定してください。' }, { status: 400 });
	}

	const sanitizedValues = sanitizeEntries(body.values);
	const saved = await gameScoreService.upsert(orgId, sanitizedValues);
	const savedAt = new Date().toISOString();

	console.log('Received /api/orgs/[oid]/game-score payload:', {
		orgId,
		values: sanitizedValues,
	});

	return json(
		{
			ok: true,
			values: saved.values,
			savedAt,
			message: 'ゲームスコアを保存しました。',
		},
		{ status: 200 },
	);
};

const sanitizeEntries = (entries: GameScoreValueEntry[]): GameScoreValueEntry[] =>
	entries
		.filter((entry) => entry && entry.metricDefinitionId)
		.map((entry) => {
			const numericValue = Number(entry.value);
			return {
				metricDefinitionId: entry.metricDefinitionId,
				value: Number.isFinite(numericValue) ? numericValue : 0,
			};
		});
