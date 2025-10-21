import type { PageServerLoad, RequestEvent } from './$types';
import jwt from 'jsonwebtoken';

export const load: PageServerLoad = async (event: RequestEvent) => {
	if ((event.locals.user?.members || []).length === 0) {
		return { iframeUrl: '' };
	}

	const METABASE_SITE_URL = 'https://metabase.oshiro.app';
	const METABASE_SECRET_KEY = 'ef93dd6872823554b5c9e87b389b346eb8c7d381532d6284d6b5b4f691071555';

	const payload = {
		resource: { dashboard: 2 },
		params: {
			// orgid: ['d4ZtXDD8O5ZjqnI8XqX3'],
		},
		exp: Math.round(Date.now() / 1000) + 10 * 60, // 10 minute expiration
	};
	const token = jwt.sign(payload, METABASE_SECRET_KEY);

	const iframeUrl = METABASE_SITE_URL + '/embed/dashboard/' + token + '#bordered=true&titled=true';

	// Whatever you return here becomes `data` in the page
	return {
		iframeUrl,
	};
};
