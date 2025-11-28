import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { GAME_SCORE_COLUMNS, createEmptyValues, valuesMapFromEntries } from './columns';
import { gameScoreService } from '$lib/services/game-score.service';

export const load: PageServerLoad = async ({ params }) => {
	const orgId = params.oid;
	if (!orgId) {
		throw error(400, '組織IDが見つかりません。');
	}

	const existing = await gameScoreService.getByOrgId(orgId);
	const values = existing ? valuesMapFromEntries(existing.values) : createEmptyValues();

	return {
		columns: GAME_SCORE_COLUMNS,
		values,
		orgId,
	};
};
