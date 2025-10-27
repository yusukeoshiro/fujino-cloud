import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { GAME_SCORE_COLUMNS } from './columns';
import { getGameScoreValues } from './game-score.store';

export const load: PageServerLoad = async ({ params }) => {
	const orgId = params.oid;
	if (!orgId) {
		throw error(400, '組織IDが見つかりません。');
	}

	const values = getGameScoreValues(orgId);

	return {
		columns: GAME_SCORE_COLUMNS,
		values,
		orgId
	};
};
