import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { GameScoreValues } from '../../_/orgs/[oid]/gps-analysis/game-score/columns';
import { saveGameScoreValues } from '../../_/orgs/[oid]/gps-analysis/game-score/game-score.store';

type GameScorePayload = {
	orgId?: string;
	values?: GameScoreValues;
};

export const POST: RequestHandler = async ({ request }) => {
	let body: GameScorePayload | null = null;
	try {
		body = (await request.json()) as GameScorePayload;
	} catch {
		// ignore parse errors
	}

	if (!body?.orgId || !body.values) {
		return json({ ok: false, message: 'orgId と values は必須です。' }, { status: 400 });
	}

	const savedValues = saveGameScoreValues(body.orgId, body.values);
	const savedAt = new Date().toISOString();

	console.log('Received /api/game-score payload:', body);

	return json(
		{
			ok: true,
			values: savedValues,
			savedAt,
			message: 'ゲームスコアを保存しました。'
		},
		{ status: 200 }
	);
};
