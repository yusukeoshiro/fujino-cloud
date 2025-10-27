import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { GAME_SCORE_COLUMNS, type GameScoreValues } from './columns';
import { getGameScoreValues, saveGameScoreValues } from './game-score.store';

export const load: PageServerLoad = async ({ params }) => {
	const orgId = params.oid;
	if (!orgId) {
		throw error(400, '組織IDが見つかりません。');
	}

	const values = getGameScoreValues(orgId);

	return {
		columns: GAME_SCORE_COLUMNS,
		values
	};
};

export const actions: Actions = {
	save: async ({ request, params }) => {
		const orgId = params.oid;
		if (!orgId) {
			return fail(400, { message: '組織IDが指定されていません。' });
		}

		const formData = await request.formData();
		const payload = formData.get('payload');

		if (typeof payload !== 'string') {
			return fail(400, { message: '保存するデータが見つかりません。' });
		}

		let parsedValues: GameScoreValues;

		try {
			const data = JSON.parse(payload);
			if (!data || typeof data !== 'object' || Array.isArray(data)) {
				throw new Error('payload must be an object map');
			}
			parsedValues = data;
		} catch (error) {
			console.error('Failed to parse game score payload', error);
			return fail(400, { message: '表データの解析に失敗しました。' });
		}

		const updatedValues = saveGameScoreValues(orgId, parsedValues);

		return {
			values: updatedValues,
			savedAt: new Date().toISOString(),
			message: 'ゲームスコアを保存しました。'
		};
	}
};
